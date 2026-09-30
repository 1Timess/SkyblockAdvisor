import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";

async function main() {
  const [usernameOrUuid, profileArg, ...questionParts] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run validate:runecrafting-advisor -- <username-or-uuid> [profile|-] [question]");
  const requestedProfile = profileArg && profileArg !== "-" ? profileArg : undefined;
  const questions = questionParts.length ? [questionParts.join(" ").trim()] : [
    "What should I focus on next for Runecrafting?",
    "How much Runecrafting XP do I have left to 25?",
    "How do I get Runecrafting XP?",
    "How do I fuse runes?",
    "How does the Runic Pedestal work?",
    "What Runecrafting level do I need for runes?",
  ];
  const inspections = [];
  for (const question of questions) {
    const result = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid, requestedProfile, question });
    if (result.context.domainContext?.domain !== "RUNECRAFTING") throw new Error(`Expected RUNECRAFTING context for question: ${question}`);
    inspections.push(result);
  }
  const first = inspections[0];
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const output = `docs/runecrafting-advisor-${safe(first.context.canonical.identity.username)}-${safe(first.context.canonical.profile.cuteName)}-targeted.json`;
  const report = {
    generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: first.context.canonical.identity.username, profile: first.context.canonical.profile.cuteName },
    inspections: inspections.map(result => {
      const context = result.context.domainContext;
      if (!context || context.domain !== "RUNECRAFTING") throw new Error("Runecrafting context disappeared during report construction.");
      return {
        question: result.context.question, route: result.route, available: result.availableAnalysis.runecrafting,
        skill: context.skill, accountMechanics: context.accountMechanics, mechanics: context.mechanics,
        runeCatalog: context.runeCatalog, progressionFocus: context.progressionFocus,
        unavailableFacts: context.unavailableFacts, candidateCount: result.context.candidates.length,
        candidates: result.context.candidates,
      };
    }),
  };
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
