import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";

async function main() {
  const [usernameOrUuid, profileArg, questionArg] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run validate:farming-advisor -- <username-or-uuid> [profile] [question]");
  const requestedProfile = profileArg && profileArg !== "-" ? profileArg : undefined;
  const questions = questionArg?.trim() ? [questionArg.trim()]
    : ["What Farming and Garden progression should I focus on next?", "What are my next visitor milestones and current Garden offers?"];
  const inspections = [];
  for (const question of questions) inspections.push(await buildAdvisorContextInspectionForPlayer({ usernameOrUuid, requestedProfile, question }));
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const selected = inspections[0].context.canonical.profile.cuteName;
  const output = `docs/farming-advisor-${safe(inspections[0].context.canonical.identity.username)}-${safe(selected)}${questionArg?.trim() ? "-targeted" : ""}.json`;
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: inspections[0].context.canonical.identity.username, profile: selected },
    inspections: inspections.map((result, index) => ({ question: questions[index], route: result.route,
      domainContext: result.context.domainContext, available: result.availableAnalysis.farming,
      candidateCount: result.context.candidates.length })),
  }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
