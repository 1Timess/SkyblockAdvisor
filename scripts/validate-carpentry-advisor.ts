import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";

const [usernameOrUuid, requestedProfile, budgetRaw] = process.argv.slice(2);
if (!usernameOrUuid || !requestedProfile) {
  console.error("Usage: npm run validate:carpentry-advisor -- <username> <profile> [budgetCoins]");
  process.exit(1);
}
const budgetCoins = budgetRaw ? Number(budgetRaw) : undefined;
const questions = [
  "What should I focus on next for Carpentry?",
  "How does Carpentry XP work?",
  "Why didn't this craft give Carpentry XP?",
  "When do I unlock Quick Crafting?",
  "What does Carpentry 25 unlock?",
  "How much Carpentry XP do I have left to 50?",
];

const reports = [];
for (const question of questions) {
  const result = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid, requestedProfile, question, budgetCoins });
  const context = result.context.domainContext;
  reports.push({
    question,
    route: result.route,
    available: result.availableAnalysis.carpentry,
    context: context?.domain === "CARPENTRY" ? context : null,
    candidateCount: result.detailedCandidates.length,
    candidates: result.detailedCandidates.map(candidate => ({ id: candidate.id, name: candidate.item.name, domain: candidate.domain })),
  });
}

const report = { generatedAt: new Date().toISOString(), player: usernameOrUuid, profile: requestedProfile, budgetCoins: budgetCoins ?? null,
  lunaCalls: 0, reports };
const filename = `carpentry-advisor-${usernameOrUuid.toLowerCase()}-${requestedProfile.toLowerCase()}-targeted.json`;
await writeFile(filename, JSON.stringify(report, null, 2));
console.log(filename);
