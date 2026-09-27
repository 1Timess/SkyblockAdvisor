import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { resolvePlayer } from "../src/server/minecraft/resolve-player";
import { hypixelClient } from "../src/server/hypixel/client";
import { selectProfile } from "../src/server/hypixel/profiles";
import { memberSchema } from "../src/server/hypixel/types";
import { buildOwnedEnchantingState } from "../src/server/enchanting/owned-state";
import { researchedExperimentTiers } from "../src/server/reference/enchanting-mechanics";

async function main() {
  const [usernameOrUuid, requestedProfileRaw] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run validate:enchanting-state -- <username-or-uuid> [profile]");
  const requestedProfile = requestedProfileRaw === "-" ? undefined : requestedProfileRaw;
  const identity = await resolvePlayer(usernameOrUuid);
  const selected = selectProfile(await hypixelClient.getProfiles(identity.uuid), requestedProfile);
  const rawMember = selected.members[identity.uuid];
  if (!rawMember) throw new Error("Player not found in selected profile.");
  const member = memberSchema.parse(rawMember);
  const owned = buildOwnedEnchantingState(member);
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const output = `docs/phase-5.4b-enchanting-state-${safe(identity.username)}-${safe(selected.cute_name)}.json`;
  const artifact = {
    generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: identity.username, profile: selected.cute_name },
    owned, tierResearch: researchedExperimentTiers,
    // Current API evidence; preserve this block so new fields and changed shapes are visible.
    rawExperimentation: member.experimentation ?? null,
  };
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
