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
import { processItem, toProfileItem } from "../items/process-item";
import { buildGear } from "../domains/gear";
import { buildAccessories } from "../domains/accessories";
import { buildAccessoryCatalog } from "../../reference/accessory-data";
import { buildPets } from "../domains/pets";
import { buildSkills } from "../domains/skills";
import { buildSlayers } from "../domains/slayers";
import { buildDungeons } from "../domains/dungeons";
import { buildMinionProgress } from "../../minions/progression";
import { buildBestiaryProgress } from "../../bestiary/progression";
import { buildCrimsonIsleProgress } from "../../crimson-isle/progression";
import { buildRiftProgress } from "../../rift/progression";
import { buildRiftEquipment,decodeRiftItems } from "../../rift/equipment";
import { buildKuudraArmorProgress } from "../../crimson-isle/equipment";
import { loadMarketSnapshot } from "../../market/snapshot-store";
import { buildCollectionsProgress, type CollectionResource } from "../../collections/profile-progress";
import { buildEconomy } from "./economy";
import { buildMiscValuation } from "./misc-valuation";
import { buildExtendedPlayerState } from "../domains/player-state";
import { buildOwnedEnchantingState } from "../../enchanting/owned-state";

type Sources = {
  resolvePlayer: typeof resolvePlayer;
  getProfiles: (uuid: string) => Promise<RawProfile[]>;
  getItems: () => Promise<HypixelItemDefinition[]>;
  getCollections?: () => Promise<CollectionResource>;
  getMarketPrices?: (ids: string[]) => Promise<Record<string, number>>;
  getLowestBinPrices?: (names: string[]) => Promise<Record<string, number>>;
};
const defaults: Sources = {
  resolvePlayer, getProfiles: uuid => hypixelClient.getProfiles(uuid), getItems: () => hypixelClient.getItems(),
  getCollections: () => hypixelClient.getCollections(),
  getMarketPrices: ids => hypixelClient.getMarketPrices(ids),
};

export async function listProfiles(input: string, sources: Sources = defaults) {
  const identity = await sources.resolvePlayer(input);
  const profiles = await sources.getProfiles(identity.uuid);
  return profilesResponseSchema.parse({ identity, profiles: profiles.map(summarizeProfile) });
}

export async function buildNormalizedProfile(input: { usernameOrUuid: string; requestedProfile?: string; requestedTab?: string; includeAccessoryPrices?: boolean }, sources: Sources = defaults) {
  const warnings: ProfileWarning[] = [];
  const identity = await sources.resolvePlayer(input.usernameOrUuid);
  const requestedTab = input.requestedTab === "gear" || input.requestedTab === "accessories" || input.requestedTab === "pets" || input.requestedTab === "skills" || input.requestedTab === "dungeons" || input.requestedTab === "minions" || input.requestedTab === "bestiary" || input.requestedTab === "collections" || input.requestedTab === "crimson-isle" || input.requestedTab === "slayer" || input.requestedTab === "rift" || input.requestedTab === "misc" ? input.requestedTab : "overview";
  const needsAccessories = requestedTab === "overview" || requestedTab === "accessories" || requestedTab === "misc";
  const needsGear = requestedTab === "overview" || requestedTab === "gear" || requestedTab === "skills" || requestedTab === "crimson-isle" || requestedTab === "misc";
  const needsPets = requestedTab === "pets" || requestedTab === "skills";
  const [profiles, catalogResult, collectionsResource] = await Promise.all([
    sources.getProfiles(identity.uuid),
    needsAccessories || requestedTab === "minions"
      ? sources.getItems().then(items => ({ items, error: false })).catch(() => ({ items: [], error: true }))
      : Promise.resolve({ items: [], error: false }),
    requestedTab === "collections"
      ? sources.getCollections?.().catch(() => null) ?? Promise.resolve(null)
      : Promise.resolve(null),
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
  const accessoryCatalog = buildAccessoryCatalog(catalogResult.items);
  let accessoryPricesById: Record<string, number> = {};
  if (input.includeAccessoryPrices) {
    accessoryPricesById = sources.getMarketPrices
      ? await sources.getMarketPrices(accessoryCatalog.map(item => item.id)).catch(() => ({}))
      : {};
    const missingNames = accessoryCatalog.filter(item => accessoryPricesById[item.id] === undefined).map(item => item.name);
    if (missingNames.length && sources.getLowestBinPrices) {
      const livePrices: Record<string, number> = await sources.getLowestBinPrices(missingNames).catch(() => ({} as Record<string, number>));
      for (const item of accessoryCatalog) {
        const price = livePrices[item.name];
        if (price !== undefined && accessoryPricesById[item.id] === undefined) accessoryPricesById[item.id] = price;
      }
    }
  }
  const normalizedAccessoryPrices = Object.fromEntries(accessoryCatalog
    .map(item => [item.name, accessoryPricesById[item.id]])
    .filter(([, price]) => typeof price === "number")) as Record<string, number>;
  if (requestedTab === "collections" && !collectionsResource) warnings.push({
    code: "REFERENCE_DATA_MISSING", scope: "collections.reference",
    message: "Collection reference definitions were unavailable. The Collections tab cannot calculate tiers.",
  });
  if (catalogResult.error) warnings.push({ code: "REFERENCE_DATA_MISSING", scope: needsAccessories ? "accessories.catalog" : "minions.catalog",
    message: needsAccessories ? "Accessory catalog unavailable; missing and upgrade lists could not be calculated." : "Minion item catalog unavailable; missing tiers could not be calculated." });
  const inventoryOptions = needsGear && needsAccessories
    ? { armor: true, equipment: true, inventory: true, accessories: true, storage: true, loadouts: true }
    : needsGear
      ? { armor: true, equipment: true, inventory: true, accessories: false, storage: true, loadouts: true }
      : needsAccessories
        ? { armor: false, equipment: false, inventory: true, accessories: true, storage: false, loadouts: false }
        : { armor: false, equipment: false, inventory: false, accessories: false, storage: false, loadouts: false };
  const decoded = await Promise.all(collectInventories(member, warnings, inventoryOptions).map(async ({ source, encoded }) => {
    const sourceWarnings: ProfileWarning[] = [];
    const rawItems = await decodeInventory(encoded, source, sourceWarnings);
    const items = rawItems.map((raw, slot) => processItem(raw, source, slot, sourceWarnings)).filter(item => item !== null);
    return { items, warnings: sourceWarnings };
  }));
  const items = decoded.flatMap(result => result.items);
  warnings.push(...decoded.flatMap(result => result.warnings));
  const extended = buildExtendedPlayerState(member);
  const riftBase = buildRiftProgress(member);
  // Only decode Rift NBT when the Rift tab requests it; do not merge these
  // inventories into ordinary SkyBlock equipment or accessory collections.
  const riftItems = requestedTab === "rift" ? await decodeRiftItems(member,warnings) : [];
  const riftEquipment = buildRiftEquipment(riftItems,{
    soulCount:riftBase.enigma.soulCount,
    charmCount:riftBase.unlocks.recognizedSecuredCount,
    cloakPurchased:riftBase.enigma.boughtCloak,
  },riftBase.inventory.availableSources);
  // Reuse the shared Bazaar + AH snapshot; only load prices on the Crimson Isle tab.
  const marketSnapshot = requestedTab === "crimson-isle" || requestedTab === "misc" ? await loadMarketSnapshot().catch(() => null) : null;
  const crimsonMarket = requestedTab === "crimson-isle" ? marketSnapshot : null;
  const result = {
    identity, profile: { ...summarizeProfile(selected), availableProfiles: profiles.map(summarizeProfile) },
    profileCreatedAt: selected.created_at ?? member.profile?.first_join ?? member.first_join ?? null,
    economy: buildEconomy(member, selected, warnings), gear: buildGear(items, member.loadout), inventoryItems: items.map(toProfileItem),
    miscValuation: buildMiscValuation(requestedTab==="misc"?items:[],marketSnapshot),
    accessories: buildAccessories(items, member, accessoryCatalog, warnings, normalizedAccessoryPrices),
    pets: await buildPets(member, warnings, needsPets),
    progression: { skills: buildSkills(member, warnings), slayers: buildSlayers(member, warnings), dungeons: buildDungeons(member, warnings),
      mining: extended.mining, foraging: extended.foraging, fishing: extended.fishing, enchanting: buildOwnedEnchantingState(member) },
    attributes: extended.attributes, shards: extended.shards, collections: extended.collections,
    unlockedCollectionTiers: extended.unlockedCollectionTiers, craftedGenerators: extended.craftedGenerators,
    collectionsProgress: buildCollectionsProgress(selected, identity.uuid, collectionsResource),
    riftProgress:{...riftBase,equipment:riftEquipment},
    crimsonIsle:{...buildCrimsonIsleProgress(member),
      equipment:buildKuudraArmorProgress(items,
        buildSkills(member, warnings).combat?.level ?? null,
        Object.fromEntries(Object.entries((member.nether_island_player_data?.kuudra_completed_tiers ?? {}) as Record<string,unknown>)
          .map(([key,value])=>[key,typeof value==="number"&&Number.isFinite(value)?value:null])),
        crimsonMarket?.quotes??{})},
    minions: buildMinionProgress(selected, catalogResult.items, !catalogResult.error && requestedTab === "minions"),
    playerStats: extended.playerStats, bestiary: { ...extended.bestiary, progression: buildBestiaryProgress(member) }, otherProgression: extended.otherProgression,
    warnings, meta: { fetchedAt: new Date().toISOString() },
  };
  return normalizedProfileSchema.parse(result);
}
