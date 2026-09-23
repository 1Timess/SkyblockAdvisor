import "server-only";
import { normalizedProfileSchema, profilesResponseSchema } from "../../../schemas/normalized-profile";
import type { ProfileWarning } from "../../../schemas/items";
import { resolvePlayer } from "../../minecraft/resolve-player";
import { hypixelClient } from "../../hypixel/client";
import { memberSchema, type HypixelItemDefinition, type RawProfile } from "../../hypixel/types";
import { selectProfile, summarizeProfile } from "../../hypixel/profiles";
import { AppError } from "../../errors";
import { collectInventories } from "./inventory-sources";
import { decodeInventory } from "../nbt/decode-inventory";
import { processItem } from "../items/process-item";
import { buildGear } from "../domains/gear";
import { buildAccessories } from "../domains/accessories";
import { buildAccessoryCatalog } from "../../reference/accessory-data";
import { buildPets } from "../domains/pets";
import { buildSkills } from "../domains/skills";
import { buildSlayers } from "../domains/slayers";
import { buildDungeons } from "../domains/dungeons";
import { buildEconomy } from "./economy";

type Sources = {
  resolvePlayer: typeof resolvePlayer;
  getProfiles: (uuid: string) => Promise<RawProfile[]>;
  getItems: () => Promise<HypixelItemDefinition[]>;
};
const defaults: Sources = {
  resolvePlayer, getProfiles: uuid => hypixelClient.getProfiles(uuid), getItems: () => hypixelClient.getItems(),
};

export async function listProfiles(input: string, sources: Sources = defaults) {
  const identity = await sources.resolvePlayer(input);
  const profiles = await sources.getProfiles(identity.uuid);
  return profilesResponseSchema.parse({ identity, profiles: profiles.map(summarizeProfile) });
}

export async function buildNormalizedProfile(input: { usernameOrUuid: string; requestedProfile?: string }, sources: Sources = defaults) {
  const warnings: ProfileWarning[] = [];
  const identity = await sources.resolvePlayer(input.usernameOrUuid);
  const [profiles, catalogResult] = await Promise.all([
    sources.getProfiles(identity.uuid),
    sources.getItems().then(items => ({ items, error: false })).catch(() => ({ items: [], error: true })),
  ]);
  const selected = selectProfile(profiles, input.requestedProfile);
  const rawMember = selected.members[identity.uuid];
  if (!rawMember) throw new AppError("MEMBER_NOT_FOUND", "The selected profile does not contain this player.", 404);
  const memberResult = memberSchema.safeParse(rawMember);
  if (!memberResult.success) {
    const fields = memberResult.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new AppError("MEMBER_CONTRACT_MISMATCH", `The selected member data does not match the supplied data contract: ${fields}`, 502);
  }
  const member = memberResult.data;
  if (catalogResult.error) warnings.push({ code: "REFERENCE_DATA_MISSING", scope: "accessories.catalog", message: "Accessory catalog unavailable; missing and upgrade lists could not be calculated." });
  const decoded = await Promise.all(collectInventories(member, warnings).map(async ({ source, encoded }) => {
    const sourceWarnings: ProfileWarning[] = [];
    const rawItems = await decodeInventory(encoded, source, sourceWarnings);
    const items = rawItems.map((raw, slot) => processItem(raw, source, slot, sourceWarnings)).filter(item => item !== null);
    return { items, warnings: sourceWarnings };
  }));
  const items = decoded.flatMap(result => result.items);
  warnings.push(...decoded.flatMap(result => result.warnings));
  const result = {
    identity, profile: { ...summarizeProfile(selected), availableProfiles: profiles.map(summarizeProfile) },
    economy: buildEconomy(member, selected, warnings), gear: buildGear(items),
    accessories: buildAccessories(items, member, buildAccessoryCatalog(catalogResult.items), warnings),
    pets: buildPets(member, warnings),
    progression: { skills: buildSkills(member, warnings), slayers: buildSlayers(member, warnings), dungeons: buildDungeons(member, warnings) },
    warnings, meta: { fetchedAt: new Date().toISOString() },
  };
  return normalizedProfileSchema.parse(result);
}
