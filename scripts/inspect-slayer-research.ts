import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { resolvePlayer } from "../src/server/minecraft/resolve-player";
import { hypixelClient } from "../src/server/hypixel/client";
import { selectProfile } from "../src/server/hypixel/profiles";
import { inspectRawSlayer } from "../src/server/slayer/research-inspection";

async function main() {
  const [usernameOrUuid, requestedProfile] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run inspect:slayer-research -- <username-or-uuid> [profile]");
  const identity = await resolvePlayer(usernameOrUuid);
  const profile = selectProfile(await hypixelClient.getProfiles(identity.uuid), requestedProfile);
  const rawMember = profile.members[identity.uuid];
  if (!rawMember || typeof rawMember !== "object" || Array.isArray(rawMember)) throw new Error("Selected player is not a profile member.");
  const rawSlayer = (rawMember as Record<string, unknown>).slayer;
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const output = `docs/slayer-research-${safe(identity.username)}-${safe(profile.cute_name)}.json`;
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: identity.username, profile: profile.cute_name }, slayer: inspectRawSlayer(rawSlayer),
  }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
