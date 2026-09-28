import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { hypixelClient } from "../src/server/hypixel/client";
import { buildGardenProgress } from "../src/server/farming/garden-progress";

async function main() {
  const [usernameOrUuid, requestedProfile] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run validate:farming-state -- <username-or-uuid> [profile]");
  const profile = await buildNormalizedProfile({ usernameOrUuid, requestedProfile });
  const garden = buildGardenProgress(await hypixelClient.getGarden(profile.profile.id));
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const output = `docs/farming-state-${safe(profile.identity.username)}-${safe(profile.profile.cuteName)}.json`;
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: profile.identity.username, profile: profile.profile.cuteName },
    farmingSkill: profile.progression.skills.farming ?? null, garden,
    note: "Garden progress is profile-wide. Crop resources and collection counts are distinct. Active offers are observed requirements, not proven inventory feasibility or value. No crop milestone threshold, contest rank, or farming rate is inferred.",
  }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
