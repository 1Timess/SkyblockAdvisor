import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";

async function main() {
  const [usernameOrUuid, profileArg, rawBudget = "500000000", ...questionParts] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run validate:carpentry-advisor -- <username-or-uuid> [profile|-] [budget] [question]");
  const requestedProfile = profileArg && profileArg !== "-" ? profileArg : undefined;
  const budgetCoins = budget(rawBudget);
  const questions = questionParts.length ? [questionParts.join(" ").trim()] : [
    "What should I focus on next for Carpentry?",
    "How does Carpentry XP work?",
    "Why didn't this craft give Carpentry XP?",
    "When do I unlock Quick Crafting?",
    "What does Carpentry 25 unlock?",
    "How much Carpentry XP do I have left to 50?",
  ];
  const inspections = [];
  for (const question of questions) {
    const result = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid, requestedProfile, budgetCoins, question });
    if (result.context.domainContext?.domain !== "CARPENTRY") throw new Error(`Expected CARPENTRY context for question: ${question}`);
    inspections.push(result);
  }
  const first = inspections[0];
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const output = `docs/carpentry-advisor-${safe(first.context.canonical.identity.username)}-${safe(first.context.canonical.profile.cuteName)}-targeted.json`;
  const report = {
    generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: first.context.canonical.identity.username, profile: first.context.canonical.profile.cuteName, budgetCoins },
    inspections: inspections.map(result => {
      const context = result.context.domainContext;
      if (!context || context.domain !== "CARPENTRY") throw new Error("Carpentry context disappeared during report construction.");
      return {
        question: result.context.question, route: result.route, available: result.availableAnalysis.carpentry,
        skill: context.skill, mechanics: context.mechanics, quickCrafting: context.quickCrafting, furniture: context.furniture,
        progressionFocus: context.progressionFocus, levelingMethods: context.levelingMethods,
        unavailableFacts: context.unavailableFacts, candidateCount: result.context.candidates.length,
        candidates: result.context.candidates,
      };
    }),
  };
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}
function budget(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Budget must be a non-negative number of coins.");
  return parsed;
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
