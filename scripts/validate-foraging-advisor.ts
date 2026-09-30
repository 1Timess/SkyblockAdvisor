import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { advisorProfileSnapshotCache } from "../src/server/advisor/profile-intelligence";

async function main() {
  const [usernameOrUuid, profileArg, rawBudget = "500000000", ...questionParts] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run validate:foraging-advisor -- <username-or-uuid> [profile|-] [budget] [question]");
  const requestedProfile = profileArg && profileArg !== "-" ? profileArg : undefined;
  const budgetCoins = budget(rawBudget);
  const question = questionParts.join(" ").trim() || "What should I upgrade or focus on next for Foraging?";
  const result = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid, requestedProfile, budgetCoins, question });
  if (result.context.domainContext?.domain !== "FORAGING") throw new Error(`Expected FORAGING context for ${usernameOrUuid}.`);

  const snapshot = await advisorProfileSnapshotCache.getOrLoad({ usernameOrUuid, requestedProfile,
    profileSnapshotId: result.diagnostics.snapshotId });
  const profile = snapshot.snapshot.profile;
  const context = result.context.domainContext;
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const output = `docs/foraging-advisor-${safe(result.context.canonical.identity.username)}-${safe(result.context.canonical.profile.cuteName)}-targeted.json`;

  const report = {
    generatedAt: new Date().toISOString(),
    lunaCalls: 0,
    question,
    player: { username: result.context.canonical.identity.username, profile: result.context.canonical.profile.cuteName, budgetCoins },
    route: result.route,
    progression: {
      foragingLevel: context.foragingLevel,
      foragingXp: context.foragingXp,
      extraLevelCap: context.extraLevelCap,
      hotfLevel: context.hotfLevel,
      treeExperience: context.treeExperience,
      activePreset: context.activePreset,
      selectedAbility: context.selectedAbility,
      progressionFocus: context.progressionFocus,
      treeGifts: context.treeGifts,
      collections: context.collections,
    },
    observed: {
      gear: context.gear,
      gearMechanics: context.gearMechanics,
      pets: context.pets,
      relevantAttributes: context.relevantAttributes,
      unavailableFacts: context.unavailableFacts,
      rawForagingProgression: profile.progression.foraging,
    },
    discovery: {
      available: result.availableAnalysis.foraging,
      rawCandidates: result.diagnostics.rawActiveScopeCandidateCount,
      relevantCandidates: result.diagnostics.goalRelevantCandidateCount,
      finalCandidates: result.context.candidates.length,
      bucketCounts: result.diagnostics.selectedBucketCounts,
      laneCounts: laneCounts(result.rawScopeCandidates),
      final: result.context.candidates.map(candidate => ({
        id: candidate.id,
        name: candidate.name,
        domain: candidate.domain,
        price: candidate.price,
        knownChanges: candidate.knownChanges,
        semanticEvidence: candidate.semanticEvidence,
        relevance: candidate.relevance,
        feasibility: candidate.feasibility,
        requirements: candidate.requirements,
        warnings: candidate.warnings,
        petAcquisitionFamily: candidate.petAcquisitionFamily ?? null,
      })),
    },
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

function laneCounts(candidates: Array<{ sourceLanes: string[] }>) {
  const counts: Record<string, number> = {};
  for (const candidate of candidates) for (const lane of candidate.sourceLanes) counts[lane] = (counts[lane] ?? 0) + 1;
  return counts;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Foraging advisor validation failed.");
  process.exitCode = 1;
});
