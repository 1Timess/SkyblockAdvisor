import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { resolvePlayer } from "../src/server/minecraft/resolve-player";
import { hypixelClient } from "../src/server/hypixel/client";
import { selectProfile } from "../src/server/hypixel/profiles";

type ObjectValue = Record<string, unknown>;

function object(value: unknown): ObjectValue | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : null;
}
function keys(value: unknown) { return Object.keys(object(value) ?? {}).sort(); }
function summarize(value: unknown, depth = 0): unknown {
  if (depth >= 4) return object(value) ? { keys: keys(value) } : Array.isArray(value) ? { arrayLength: value.length } : value;
  if (Array.isArray(value)) return { arrayLength: value.length, sample: value.slice(0, 3).map(entry => summarize(entry, depth + 1)) };
  const record = object(value);
  if (!record) return value;
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => [key, summarize(entry, depth + 1)]));
}
function pickExperience(value: unknown) {
  const record = object(value);
  if (!record) return null;
  return Object.fromEntries(Object.entries(record).filter(([key]) => /forag/i.test(key)));
}

async function main() {
  const [usernameOrUuid, requestedProfile] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run inspect:foraging-api -- <username-or-uuid> [profile]");
  const identity = await resolvePlayer(usernameOrUuid);
  const profile = selectProfile(await hypixelClient.getProfiles(identity.uuid), requestedProfile);
  const member = object(profile.members[identity.uuid]);
  if (!member) throw new Error("Selected player is not a profile member.");

  const playerData = object(member.player_data), skillTree = object(member.skill_tree);
  const nodes = object(skillTree?.nodes);
  const evidence = {
    topLevelRelevantKeys: keys(member).filter(key => /forag|skill_tree|collection|attribute|shard/i.test(key)),
    playerData: {
      keys: keys(playerData),
      foragingExperience: pickExperience(playerData?.experience),
    },
    skillTree: {
      keys: keys(skillTree),
      nodeGroups: keys(nodes),
      foragingNodeGroups: Object.fromEntries(["foraging", "foraging_2", "foraging_3", "foraging_4", "foraging_5"]
        .map(group => [group, summarize(nodes?.[group])])),
      experience: summarize(skillTree?.experience),
      tokensSpent: summarize(skillTree?.tokens_spent),
      selectedAbility: summarize(skillTree?.selected_ability),
      selectedSkillTreeSlot: summarize(skillTree?.selected_skill_tree_slot),
    },
    foragingCore: summarize(member.foraging_core, -2),
    foraging: summarize(member.foraging),
    foragingCollections: Object.fromEntries(Object.entries(object(member.collection) ?? {})
      .filter(([key]) => /wood|log|fig|mangrove|helix|honeycomb|veilshroom/i.test(key))
      .sort(([a], [b]) => a.localeCompare(b))),
    attributes: summarize(member.attributes),
    shards: summarize(member.shards),
  };

  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const output = `docs/foraging-api-${safe(identity.username)}-${safe(profile.cute_name)}.json`;
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: identity.username, uuid: identity.uuid, profile: profile.cute_name, profileId: profile.profile_id },
    evidence,
  }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
