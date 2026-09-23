import { buildAdvisorContextForPlayer } from "../src/server/advisor/build-live-context";
import { callLunaAdvisor } from "../src/server/advisor/luna";

async function main() {
  const [username = "iTimess", requestedProfile = "Lemon", rawBudget = "30000000", ...questionParts] = process.argv.slice(2);
  const budgetCoins = Number(rawBudget);
  if (!Number.isFinite(budgetCoins) || budgetCoins < 0) throw new Error("Budget must be a non-negative number of coins.");
  const question = questionParts.join(" ").trim() || "I just cleared F5 and have 30m coins. What should I upgrade next?";
  const context = await buildAdvisorContextForPlayer({ usernameOrUuid: username, requestedProfile, question, budgetCoins });
  const result = await callLunaAdvisor(context);
  console.log(JSON.stringify({
    context: { question: context.question, candidateCount: context.candidates.length, candidateIds: context.candidates.map(candidate => candidate.id) },
    advice: result.advice,
    meta: result.meta,
  }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Advisor inspection failed."); process.exitCode = 1; });
