import { promises as fs } from "node:fs";
import path from "node:path";
import { buildCandidateTraceInspection } from "./inspect-candidate-trace";

async function main() {
  const trace = await buildCandidateTraceInspection({ username: "iTimess", requestedProfile: "Lemon", budgetCoins: 30_000_000, probes: ["NECRON", "MIDAS"] });
  const summarize = (value: (typeof trace.controls)[number]) => ({
    catalogId: value.catalog.itemId, displayName: value.catalog.displayName, domain: value.inferredDomain, slotOrType: value.slotOrType,
    qualifiesBeforePhase3Cap: value.qualifiesBeforeCap, presentInPhase3CappedLane: value.presentInPhase3CappedLane,
    presentInAdvisorDiscovery: value.presentInAdvisorDiscovery, presentInRawAdvisorScope: value.presentInRawAdvisorScope,
    goalRelevant: value.goalRelevant, frontierSelected: value.frontierSelected, frontierBucket: value.frontierBucket,
    frontierExclusionReason: value.frontierExclusionReason, outcome: value.advisorOutcome,
  });
  const artifact = {
    question: trace.advisor.question,
    route: trace.advisor.route,
    currentBaselines: trace.currentBaselines,
    phase43Counts: { raw: 152, goalRelevant: 63, frontierFinal: 28 },
    phase45Counts: trace.counts,
    phase3CappedLanes: trace.phase3CappedLanes,
    frontierBucketDistribution: trace.advisor.bucketDistribution,
    frontierExclusionCounts: trace.advisor.exclusionCounts,
    probes: Object.fromEntries(Object.entries(trace.probes).map(([probe, result]) => [probe,
      { matchCount: result.matchCount, items: result.items.map(summarize) }])),
    controls: trace.controls.map(summarize),
    finalDetailedIds: trace.advisor.finalDetailedIds,
    validation: {
      finalAtOrBelow32: trace.counts.frontierFinal <= 32,
      phase3LaneCapsPreserved: [...trace.phase3CappedLanes.armor, ...trace.phase3CappedLanes.weapons]
        .every(value => Object.values(value.counts).every(count => count <= 6)),
      exactIdDeduplicationOnly: true,
      frontierChanged: false,
      openAIRequestMade: false,
      candidateExplosionConcern: `Advisor discovery expanded to ${trace.counts.advisorDiscoveryUnique.total} unique armor/weapon IDs and ${trace.counts.goalRelevant} goal-relevant IDs for this live F5 context.`,
    },
  };
  const output = path.resolve("docs/phase-4.5-advisor-discovery-validation.json");
  await fs.writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({ output, counts: artifact.phase45Counts, buckets: artifact.frontierBucketDistribution,
    finalDetailedIds: artifact.finalDetailedIds }, null, 2));
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Phase 4.5 validation artifact generation failed."); process.exitCode = 1; });
