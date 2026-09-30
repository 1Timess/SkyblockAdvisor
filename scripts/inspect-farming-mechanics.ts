import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { inspectFarmingMechanics } from "../src/server/farming/mechanics-inspection";

async function main() {
  const [usernameOrUuid, requestedProfile] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run inspect:farming-mechanics -- <username-or-uuid> [profile]");
  const profile = await buildNormalizedProfile({ usernameOrUuid, requestedProfile });
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const output = `docs/farming-mechanics-${safe(profile.identity.username)}-${safe(profile.profile.cuteName)}.json`;
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: profile.identity.username, profile: profile.profile.cuteName },
    evidence: inspectFarmingMechanics(profile),
  }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
