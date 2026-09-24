import { promises as fs } from "node:fs";
import path from "node:path";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";

const question = "I just cleared F5 and have 30m coins. What should I upgrade next?";

async function main() {
  const result = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid: "iTimess", requestedProfile: "Lemon", budgetCoins: 30_000_000, question });
  const artifact = {
    question,
    route: result.route,
    goal: result.route.goal,
    inferredRole: result.route.inferredRole,
    rawScopeCandidateCount: result.diagnostics.rawActiveScopeCandidateCount,
    goalRelevantCandidateCount: result.diagnostics.goalRelevantCandidateCount,
    finalDetailedCandidateCount: result.detailedCandidates.length,
    selectedBucketCounts: result.diagnostics.selectedBucketCounts,
    exclusionCounts: result.diagnostics.exclusionCounts,
    unselectedGoalRelevantCount: result.diagnostics.unselectedGoalRelevantCount,
    rawScopeCandidates: result.rawScopeCandidates,
    goalRelevantCandidates: result.frontierCandidates.map(value => ({
      candidateId: value.candidate.id,
      domain: value.candidate.domain,
      name: value.candidate.item.name,
      relevance: value.relevance,
      price: value.candidate.price ?? null,
      feasibility: value.feasibility,
      sourceLanes: value.sourceLanes,
      selectionBucket: value.selection.bucket,
      selected: value.selection.selected,
      selectionReason: value.selection.reason,
      exclusionReason: value.selection.exclusionReason,
      redundancyKey: value.selection.redundancyKey,
      priorityFacts: value.selection.priorityFacts,
    })),
    finalDetailedCandidates: result.detailedCandidates.map(value => value.id),
  };
  const output = path.resolve("docs/phase-4.3-f5-candidate-frontier.json");
  await fs.writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({ output, counts: {
    raw: artifact.rawScopeCandidateCount, relevant: artifact.goalRelevantCandidateCount, final: artifact.finalDetailedCandidateCount,
    buckets: artifact.selectedBucketCounts, exclusions: artifact.exclusionCounts, unselected: artifact.unselectedGoalRelevantCount,
  }, finalDetailedCandidates: artifact.finalDetailedCandidates }, null, 2));
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Artifact generation failed."); process.exitCode = 1; });
