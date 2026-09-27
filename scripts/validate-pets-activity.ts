import "server-only";
import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";

async function main() {
  const [username = "iTimess", profileRaw = "Lemon", budgetRaw = "500000000", ...questionParts] = process.argv.slice(2);
  const requestedProfile = normalizeProfile(profileRaw);
  const budgetCoins = parseBudget(budgetRaw);
  const question = questionParts.join(" ").trim() || "What should I upgrade for mining?";
  const result = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid: username, requestedProfile, budgetCoins, question });

  if (result.route.domain !== "MINING" && result.route.domain !== "FISHING") {
    throw new Error(`5.3G activity-pet validation requires a MINING or FISHING route; got ${result.route.domain ?? "none"}.`);
  }

  const rawPetIds = new Set(result.rawScopeCandidates.filter(value => value.domain === "pet").map(value => value.candidateId));
  const frontierPets = result.frontierCandidates.filter(value => value.candidate.domain === "pet");
  const selectedPets = frontierPets.filter(value => value.selection.selected);
  const finalPets = result.context.candidates.filter(value => value.domain === "pet");
  const finalById = new Map(finalPets.map(value => [value.id, value]));

  const selectedFamiliesPreserved = selectedPets.every(value => {
    const source = value.candidate.petAcquisitionFamily;
    if (!source) return true;
    const compact = finalById.get(value.candidate.id)?.petAcquisitionFamily;
    return compact?.familyId === source.familyId
      && compact.members.length === source.members.length
      && compact.members.every((member, index) => member.id === source.members[index]?.id);
  });

  const invariants = {
    routeIsActivity: result.route.domain === "MINING" || result.route.domain === "FISHING",
    finalContextWithinCeiling: result.context.candidates.length <= 32,
    selectedPetsReachFinalContext: selectedPets.every(value => finalById.has(value.candidate.id)),
    selectedFamiliesPreserved,
  };

  const artifact = {
    generatedAt: new Date().toISOString(),
    lunaCalls: 0,
    player: {
      username: result.context.canonical.identity.username,
      profile: result.context.canonical.profile.cuteName,
      budgetCoins,
    },
    question,
    route: result.route,
    counts: {
      rawScopeCandidates: result.diagnostics.rawActiveScopeCandidateCount,
      rawPetCandidates: rawPetIds.size,
      goalRelevantCandidates: result.diagnostics.goalRelevantCandidateCount,
      frontierPetCandidates: frontierPets.length,
      selectedPetCandidates: selectedPets.length,
      finalCandidates: result.context.candidates.length,
      finalPetCandidates: finalPets.length,
    },
    invariants,
    diagnostics: {
      selectedBucketCounts: result.diagnostics.selectedBucketCounts,
      exclusionCounts: result.diagnostics.exclusionCounts,
      unselectedGoalRelevantCount: result.diagnostics.unselectedGoalRelevantCount,
      removedPetCandidatesByRelevance: result.diagnostics.removedByRelevance.filter(value => value.domain === "pet"),
    },
    pets: {
      raw: result.rawScopeCandidates.filter(value => value.domain === "pet"),
      frontier: frontierPets.map(value => ({
        id: value.candidate.id,
        name: value.candidate.item.name,
        sourceLanes: value.sourceLanes,
        relevance: value.relevance,
        feasibility: value.feasibility,
        family: value.candidate.petAcquisitionFamily ?? null,
        selection: value.selection,
      })),
      selected: selectedPets.map(value => ({
        id: value.candidate.id,
        name: value.candidate.item.name,
        sourceLanes: value.sourceLanes,
        relevance: value.relevance,
        feasibility: value.feasibility,
        knownChanges: value.candidate.knownChanges ?? {},
        family: value.candidate.petAcquisitionFamily ?? null,
        warnings: value.candidate.warnings,
      })),
      finalContext: finalPets.map(value => ({
        id: value.id,
        name: value.name,
        rarity: value.rarity,
        price: value.price,
        knownChanges: value.knownChanges,
        relevance: value.relevance,
        feasibility: value.feasibility,
        family: value.petAcquisitionFamily ?? null,
        warnings: value.warnings,
      })),
    },
  };

  const safeProfile = (result.context.canonical.profile.cuteName || "selected").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const safeUser = result.context.canonical.identity.username.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const output = `docs/phase-5.3g-pets-activity-${safeUser}-${safeProfile}.json`;
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);

  if (Object.values(invariants).some(value => !value)) process.exitCode = 1;
}

function normalizeProfile(value: string) {
  return value === "-" || value.toLowerCase() === "selected" ? undefined : value;
}

function parseBudget(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Budget must be a non-negative number of coins.");
  return parsed;
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
