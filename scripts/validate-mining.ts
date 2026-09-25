import "server-only";
import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { advisorProfileSnapshotCache } from "../src/server/advisor/profile-intelligence";

async function main() {
  const [firstUsername = "iTimess", firstProfile = "Lemon", firstRawBudget = "30000000", secondUsername = "ShinyFloa", secondProfile = "-", secondRawBudget = "2000000000", ...questionParts] = process.argv.slice(2);
  const firstBudgetCoins = budget(firstRawBudget), secondBudgetCoins = budget(secondRawBudget);
  const question = questionParts.join(" ").trim() || "What should I upgrade for mining?";
  const inputs = [
    { usernameOrUuid: firstUsername, requestedProfile: normalizeProfile(firstProfile), budgetCoins: firstBudgetCoins },
    { usernameOrUuid: secondUsername, requestedProfile: normalizeProfile(secondProfile), budgetCoins: secondBudgetCoins },
  ];
  const reports = [];
  for (const input of inputs) {
    const result = await buildAdvisorContextInspectionForPlayer({ ...input, question });
    if (result.context.domainContext?.domain !== "MINING") throw new Error(`Expected MINING context for ${input.usernameOrUuid}.`);
    const snapshot = await advisorProfileSnapshotCache.getOrLoad({ usernameOrUuid: input.usernameOrUuid, requestedProfile: input.requestedProfile,
      profileSnapshotId: result.diagnostics.snapshotId });
    const profile = snapshot.snapshot.profile, mining = result.context.domainContext;
    reports.push({
      player: { username: result.context.canonical.identity.username, profile: result.context.canonical.profile.cuteName, budgetCoins: input.budgetCoins },
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
      visibleMiningInventory: profile.inventoryItems.filter(item => miningItem(item.categories, item.stats)).map(item => ({
        id: item.id, name: item.name, source: item.source, categories: item.categories, stats: miningStats(item.stats),
      })),
      equippedMiningGear: [...profile.gear.armor.items, ...profile.gear.equipment.items].filter(item => miningItem(item.categories, item.stats)).map(item => ({
        id: item.id, name: item.name, source: item.source, categories: item.categories, stats: miningStats(item.stats),
      })),
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
  const artifact = { generatedAt: new Date().toISOString(), lunaCalls: 0, question, reports };
  await writeFile("docs/phase-5.2e-mining-validation.json", `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log("Wrote docs/phase-5.2e-mining-validation.json");
}

function normalizeProfile(value: string) { return value === "-" || value.toLowerCase() === "selected" ? undefined : value; }
function budget(value: string) { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Budgets must be non-negative numbers of coins."); return parsed; }
function miningStats(stats: Record<string, number>) { return Object.fromEntries(Object.entries(stats).filter(([key]) => ["miningSpeed", "miningFortune", "gemstoneFortune", "pristine", "coldResistance"].includes(key))); }
function miningItem(categories: string[], stats: Record<string, number>) {
  return categories.some(category => ["pickaxe", "drill", "helmet", "chestplate", "leggings", "boots", "equipment", "necklace", "cloak", "belt", "gloves", "bracelet"].includes(category))
    && Object.keys(miningStats(stats)).length > 0;
}
function laneCounts(candidates: Array<{ sourceLanes: string[] }>) {
  const counts: Record<string, number> = {};
  for (const candidate of candidates) for (const lane of candidate.sourceLanes) counts[lane] = (counts[lane] ?? 0) + 1;
  return counts;
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Mining validation failed."); process.exitCode = 1; });
