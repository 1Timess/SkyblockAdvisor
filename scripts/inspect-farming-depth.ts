import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { getServerEnv } from "../src/server/env";
import { fetchUpstream, readJson } from "../src/server/http";
import { resolvePlayer } from "../src/server/minecraft/resolve-player";
import { hypixelClient } from "../src/server/hypixel/client";
import { selectProfile } from "../src/server/hypixel/profiles";
import { inspectFarmingDepth } from "../src/server/farming/depth-inspection";

async function main() {
  const [usernameOrUuid, requestedProfile] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run inspect:farming-depth -- <username-or-uuid> [profile]");
  const identity = await resolvePlayer(usernameOrUuid);
  const profile = selectProfile(await hypixelClient.getProfiles(identity.uuid), requestedProfile);
  const member = profile.members[identity.uuid];
  if (!member || typeof member !== "object" || Array.isArray(member)) throw new Error("Selected player is not a profile member.");
  const response = await fetchUpstream(`https://api.hypixel.net/v2/skyblock/garden?profile=${encodeURIComponent(profile.profile_id)}`,
    fetch, { "API-Key": getServerEnv().HYPIXEL_API_KEY });
  if (response.status === 401 || response.status === 403) throw new Error("The Hypixel API key was rejected for Garden research.");
  if (response.status === 429) throw new Error("Hypixel rate limit reached for Garden research.");
  if (response.status !== 404 && !response.ok) throw new Error(`Garden lookup failed with HTTP ${response.status}.`);
  const raw = response.status === 404 ? null : await readJson(response);
  const envelope = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
  if (response.ok && (envelope?.success !== true || !envelope.garden || typeof envelope.garden !== "object"))
    throw new Error("Hypixel Garden response did not match the expected envelope.");
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const output = `docs/farming-depth-${safe(identity.username)}-${safe(profile.cute_name)}.json`;
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: identity.username, profile: profile.cute_name }, gardenEndpointStatus: response.status,
    evidence: inspectFarmingDepth(member, envelope?.garden ?? null),
  }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
