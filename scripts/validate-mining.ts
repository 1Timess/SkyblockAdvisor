import "server-only";
import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";

async function main() {
  const [firstUsername = "iTimess", firstProfile = "Lemon", secondUsername = "ShinyFloa", secondProfile = "-", rawBudget = "30000000", ...questionParts] = process.argv.slice(2);
  const budgetCoins = Number(rawBudget);
  if (!Number.isFinite(budgetCoins) || budgetCoins < 0) throw new Error("Budget must be a non-negative number of coins.");
  const question = questionParts.join(" ").trim() || "What should I upgrade for mining?";
  const inputs = [
    { usernameOrUuid: firstUsername, requestedProfile: normalizeProfile(firstProfile) },
    { usernameOrUuid: secondUsername, requestedProfile: normalizeProfile(secondProfile) },
  ];
  const reports = [];
  for (const input of inputs) {
    const result = await buildAdvisorContextInspectionForPlayer({ ...input, question, budgetCoins });
    if (result.context.domainContext?.domain !== "MINING") throw new Error(`Expected MINING context for ${input.usernameOrUuid}.`);
    const mining = result.context.domainContext;
    reports.push({
      player: { username: result.context.canonical.identity.username, profile: result.context.canonical.profile.cuteName },
      progression: {
        miningLevel: mining.miningLevel?.level ?? null,
        hotmLevel: mining.hotmLevel,
        stage: mining.miningKnowledge.stage,
        activity: mining.miningKnowledge.activity,
        access: mining.miningKnowledge.access,
        powders: { mithril: mining.mithrilPowder, gemstone: mining.gemstonePowder, glacite: mining.glacitePowder },
        crystalNucleus: mining.crystalHollows.nucleus,
        glaciteTunnels: mining.glaciteTunnels,
        relevantStats: mining.miningKnowledge.relevantStats,
      },
      discovery: {
        rawCandidates: result.diagnostics.rawActiveScopeCandidateCount,
        relevantCandidates: result.diagnostics.goalRelevantCandidateCount,
        finalCandidates: result.context.candidates.length,
        bucketCounts: result.diagnostics.selectedBucketCounts,
        laneCounts: laneCounts(result.rawScopeCandidates),
        final: result.context.candidates.map(candidate => ({
          id: candidate.id, name: candidate.name, domain: candidate.domain, price: candidate.price?.coins ?? null,
          relevantStats: candidate.relevance.relevantStats, knownChanges: candidate.knownChanges,
          requirementStatus: candidate.feasibility.requirementStatus, priceStatus: candidate.feasibility.priceStatus,
          requirements: candidate.feasibility.requirements,
        })),
      },
    });
  }
  const artifact = { generatedAt: new Date().toISOString(), lunaCalls: 0, question, budgetCoins, reports };
  await writeFile("docs/phase-5.2e-mining-validation.json", `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log("Wrote docs/phase-5.2e-mining-validation.json");
}

function normalizeProfile(value: string) { return value === "-" || value.toLowerCase() === "selected" ? undefined : value; }
function laneCounts(candidates: Array<{ sourceLanes: string[] }>) {
  const counts: Record<string, number> = {};
  for (const candidate of candidates) for (const lane of candidate.sourceLanes) counts[lane] = (counts[lane] ?? 0) + 1;
  return counts;
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Mining validation failed."); process.exitCode = 1; });
