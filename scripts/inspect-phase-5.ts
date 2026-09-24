import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import type { AdvisorConversationState } from "../src/schemas/advisor";

const questions = [
  "I just cleared F6 and have 30m coins. What should I upgrade next?",
  "Okay, what about my MP then?",
  "I'm looking for fishing gear. What's the best upgrade available to me?",
  "What should I upgrade for mining?",
];

async function main() {
  let conversationState: AdvisorConversationState | undefined;
  const reports = [];
  for (const question of questions) {
    const result = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid: "iTimess", requestedProfile: "Lemon",
      question, budgetCoins: conversationState ? undefined : 30_000_000, conversationState });
    conversationState = result.nextConversationState;
    reports.push({ question, resolvedDomain: result.route.domain, goal: result.route.goal, cacheReused: result.diagnostics.cacheReused,
      canonicalPayloadIncluded: result.diagnostics.canonicalIncluded, domainPayloadIncluded: result.context.domainContext?.domain ?? null,
      unrelatedDomainsExcluded: result.diagnostics.excludedDomains,
      rawCandidateCount: result.diagnostics.rawActiveScopeCandidateCount,
      goalRelevantCandidateCount: result.diagnostics.goalRelevantCandidateCount,
      finalContextCount: result.context.candidates.length,
      finalCandidateIds: result.context.candidates.map(candidate => candidate.id),
      budgetCoins: result.context.conversationState?.budgetCoins ?? null,
      snapshotId: result.diagnostics.snapshotId,
    });
  }
  const artifact = { generatedAt: new Date().toISOString(), lunaCalls: 0, profile: { username: "iTimess", cuteName: "Lemon" }, reports };
  await writeFile("docs/phase-5-domain-routing-validation.json", `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(artifact, null, 2));
}
main().catch(async error => {
  const message = error instanceof Error ? error.message : "Phase 5 inspection failed.";
  await writeFile("docs/phase-5-domain-routing-validation.json", `${JSON.stringify({ generatedAt: new Date().toISOString(), status: "BLOCKED",
    lunaCalls: 0, profile: { username: "iTimess", cuteName: "Lemon" }, completedQuestions: 0, error: message, questions }, null, 2)}\n`, "utf8");
  console.error(message); process.exitCode = 1;
});
