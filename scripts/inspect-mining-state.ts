import "server-only";
import { resolvePlayer } from "../src/server/minecraft/resolve-player";
import { hypixelClient } from "../src/server/hypixel/client";
import { memberSchema } from "../src/server/hypixel/types";
import { selectProfile } from "../src/server/hypixel/profiles";

const username = process.env.INSPECT_USERNAME?.trim() || "iTimess";
const requestedProfile = process.env.INSPECT_PROFILE?.trim() || undefined;
const terms = ["glacite", "mineshaft", "corpse", "cold", "commission", "powder"];

async function main() {
  const identity = await resolvePlayer(username);
  const profiles = await hypixelClient.getProfiles(identity.uuid);
  const selected = selectProfile(profiles, requestedProfile);
  const rawMember = selected.members[identity.uuid];
  const member = memberSchema.parse(rawMember);
  const matches: Array<{ path: string; value: unknown }> = [];
  walk(rawMember, "", matches);
  console.log(JSON.stringify({
    identity, profile: { id: selected.profile_id, cuteName: selected.cute_name, selected: selected.selected ?? false },
    miningCore: member.mining_core ?? null,
    miningTree: { experience: member.skill_tree?.experience?.mining ?? null, nodes: member.skill_tree?.nodes?.mining ?? null,
      tokensSpent: member.skill_tree?.tokens_spent ?? null, selectedAbility: member.skill_tree?.selected_ability ?? null,
      selectedTreeSlot: member.skill_tree?.selected_skill_tree_slot ?? null },
    relatedFields: matches,
  }, null, 2));
}

function walk(value: unknown, path: string, matches: Array<{ path: string; value: unknown }>) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, path ? `${path}[${index}]` : `[${index}]`, matches));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const next = path ? `${path}.${key}` : key;
    if (terms.some(term => key.toLowerCase().includes(term))) matches.push({ path: next, value: entry });
    walk(entry, next, matches);
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Mining state inspection failed."); process.exitCode = 1; });
