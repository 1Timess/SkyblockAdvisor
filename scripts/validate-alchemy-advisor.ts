import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";

async function main() {
  const [usernameOrUuid, profileArg, rawBudget = "500000000", ...questionParts] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run validate:alchemy-advisor -- <username-or-uuid> [profile|-] [budget] [question]");
  const requestedProfile = profileArg && profileArg !== "-" ? profileArg : undefined;
  const budgetCoins = budget(rawBudget);
  const questions = questionParts.length ? [questionParts.join(" ").trim()] : [
    "What should I focus on next for Alchemy?",
    "What is the most cost-efficient way for me to level Alchemy?",
    "What potion should I brew for mining?",
    "How do I brew Speed?",
    "How do I brew Invisibility?",
    "Which God Potion mixins can I use?",
    "How long will my God Potion last?",
  ];
  const inspections = [];
  for (const question of questions) {
    const result = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid, requestedProfile, budgetCoins, question });
    if (result.context.domainContext?.domain !== "ALCHEMY") throw new Error(`Expected ALCHEMY context for question: ${question}`);
    inspections.push(result);
  }
  const first = inspections[0];
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const output = `docs/alchemy-advisor-${safe(first.context.canonical.identity.username)}-${safe(first.context.canonical.profile.cuteName)}-targeted.json`;
  const report = {
    generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: first.context.canonical.identity.username, profile: first.context.canonical.profile.cuteName, budgetCoins },
    inspections: inspections.map(result => {
      const context = result.context.domainContext;
      if (!context || context.domain !== "ALCHEMY") throw new Error("Alchemy context disappeared during report construction.");
      return {
        question: result.context.question, route: result.route, available: result.availableAnalysis.alchemy,
        skill: context.skill, wisdom: context.wisdom, progressionFocus: context.progressionFocus, brewing: context.brewing, potionAffinity: context.potionAffinity,
        godPotion: context.godPotion, potionCatalog: context.potionCatalog, levelingMethods: context.levelingMethods,
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
