import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";

async function main() {
  const [username = "iTimess", requestedProfile = "Lemon", rawBudget = "30000000", ...questionParts] = process.argv.slice(2);
  const budgetCoins = Number(rawBudget);
  if (!Number.isFinite(budgetCoins) || budgetCoins < 0) throw new Error("Budget must be a non-negative number of coins.");
  const question = questionParts.join(" ").trim() || "I just cleared F5 and have 30m coins. What should I upgrade next?";
  const result = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid: username, requestedProfile, budgetCoins, question });
  const domainCounts = Object.fromEntries(["armor", "weapon", "accessory", "pet"].map(domain =>
    [domain, result.context.candidates.filter(candidate => candidate.domain === domain).length]));
  console.log(JSON.stringify({
    input: { username, requestedProfile, budgetCoins, question },
    route: result.route,
    goal: result.route.goal,
    inferredRole: result.route.inferredRole,
    clarificationAppropriate: result.route.clarificationRecommended,
    compactPlayer: { ...result.context.player, currentGear: result.context.currentGear },
    availableAnalysis: result.availableAnalysis,
    rawActiveScopeCandidateCount: result.diagnostics.rawActiveScopeCandidateCount,
    goalRelevantCandidateCount: result.diagnostics.goalRelevantCandidateCount,
    detailedCandidateCount: result.context.candidates.length,
    detailedCandidateDomainCounts: domainCounts,
    scopeChecks: {
      detailedAccessoriesExcluded: domainCounts.accessory === 0,
      detailedPetsExcluded: domainCounts.pet === 0,
      accessoriesDiscoverable: result.availableAnalysis.accessories.available,
      petsDiscoverable: result.availableAnalysis.pets.available,
    },
    warningSummary: { before: result.diagnostics.profileWarningCount, after: result.diagnostics.compactWarningCount, warnings: result.context.warnings },
    petDiagnostics: {
      ownedCount: result.diagnostics.petOwnedCount,
      uniqueTypeCount: result.diagnostics.petUniqueTypeCount,
      duplicateCount: result.diagnostics.petDuplicateCount,
      level100RabbitDetected: result.diagnostics.level100RabbitDetected,
      rabbitLowerLevelTargetSuppressed: result.diagnostics.rabbitLowerLevelTargetSuppressed,
      rabbitNoOpSuppressed: result.diagnostics.rabbitNoOpSuppressed,
    },
    removedByRelevance: summarizeRemoved(result.diagnostics.removedByRelevance),
    frontierDiagnostics: {
      selectedBucketCounts: result.diagnostics.selectedBucketCounts,
      exclusionCounts: result.diagnostics.exclusionCounts,
      unselectedGoalRelevantCount: result.diagnostics.unselectedGoalRelevantCount,
    },
    rawScopeCandidates: result.rawScopeCandidates,
    goalRelevantCandidates: result.frontierCandidates.map(candidate => ({
      candidateId: candidate.candidate.id,
      domain: candidate.candidate.domain,
      name: candidate.candidate.item.name,
      relevance: candidate.relevance,
      price: candidate.candidate.price ?? null,
      feasibility: candidate.feasibility,
      sourceLanes: candidate.sourceLanes,
      selectionBucket: candidate.selection.bucket,
      selected: candidate.selection.selected,
      selectionReason: candidate.selection.reason,
      exclusionReason: candidate.selection.exclusionReason,
      redundancyKey: candidate.selection.redundancyKey,
      priorityFacts: candidate.selection.priorityFacts,
    })),
    detailedCandidates: result.context.candidates.map(candidate => ({
      candidateId: candidate.id,
      domain: candidate.domain,
      name: candidate.name,
      relevance: candidate.relevance,
      price: candidate.price,
      knownChanges: candidate.knownChanges,
      requirements: candidate.requirements,
      feasibility: candidate.feasibility,
      selection: result.frontierCandidates.find(value => value.candidate.id === candidate.id)?.selection,
      warnings: candidate.warnings,
      sourceLanes: result.candidateLanes[candidate.id] ?? [],
    })),
  }, null, 2));
}

function summarizeRemoved(removed: Array<{ id: string; domain: string; name: string; sourceLanes: string[]; reason: string }>) {
  const groups = new Map<string, typeof removed>();
  for (const candidate of removed) for (const lane of candidate.sourceLanes) {
    const parts = lane.split(":"), laneFamily = `${parts[0]}:${parts.at(-1)}`;
    groups.set(laneFamily, [...(groups.get(laneFamily) ?? []), candidate]);
  }
  return { count: removed.length, groups: [...groups].map(([laneFamily, candidates]) => {
    const examples = [...new Map([...candidates.slice(0, 3), ...candidates.slice(-3)].map(candidate => [candidate.id, candidate])).values()];
    return { laneFamily, count: new Set(candidates.map(candidate => candidate.id)).size,
      examples: examples.map(({ id, domain, name, reason }) => ({ id, domain, name, reason })) };
  }) };
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Advisor context inspection failed."); process.exitCode = 1; });
