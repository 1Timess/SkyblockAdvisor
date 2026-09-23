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
    removedByRelevance: result.diagnostics.removedByRelevance,
    detailedCandidates: result.context.candidates.map(candidate => ({
      candidateId: candidate.id,
      domain: candidate.domain,
      name: candidate.name,
      relevance: candidate.relevance,
      price: candidate.price,
      knownChanges: candidate.knownChanges,
      requirements: candidate.requirements,
      feasibility: candidate.feasibility,
      warnings: candidate.warnings,
      sourceLanes: result.candidateLanes[candidate.id] ?? [],
    })),
  }, null, 2));
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Advisor context inspection failed."); process.exitCode = 1; });
