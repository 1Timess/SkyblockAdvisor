import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { hypixelClient } from "../src/server/hypixel/client";
import { loadMarketSnapshot } from "../src/server/market/snapshot-store";
import { buildItemCatalog } from "../src/server/reference/item-catalog";
import { loadNeuRepository } from "../src/server/reference/neu/repository";
import { catalogCoverageSummary, traceCandidateCoverage } from "../src/server/candidates/trace";
import { buildArmorLanes } from "../src/server/candidates/armor";
import { buildWeaponLanes } from "../src/server/candidates/weapon";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";

const controlIds = ["STARRED_SHADOW_FURY", "FLOWER_OF_TRUTH", "GIANTS_SWORD", "BERSERKER_CHESTPLATE", "BURNING_TERROR_HELMET"];

export async function buildCandidateTraceInspection(input: { username: string; requestedProfile: string; budgetCoins: number; probes: string[] }) {
  const { username, requestedProfile, budgetCoins, probes } = input;
  if (!Number.isFinite(budgetCoins) || budgetCoins < 0) throw new Error("Budget must be a non-negative number of coins.");
  const [profile, items, neu, snapshot] = await Promise.all([
    buildNormalizedProfile({ usernameOrUuid: username, requestedProfile }), hypixelClient.getItems(), loadNeuRepository(), loadMarketSnapshot(),
  ]);
  const catalog = buildItemCatalog(items, neu).getAll(), quotes = new Map(Object.entries(snapshot?.quotes ?? {}));
  const question = "I just cleared F5 and have 30m coins. What should I upgrade next?";
  const advisor = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid: username, requestedProfile, budgetCoins, question });
  const armorBuilds = profile.gear.armor.items.map(current => buildArmorLanes({ current, catalog, profile, quotes, budgetCoins, eligibilityMode: "ADVISOR_DISCOVERY" }));
  const weaponBuilds = profile.gear.weapons.map(current => ({ current: current.id ?? current.name,
    result: buildWeaponLanes({ current, catalog, profile, quotes, budgetCoins, eligibilityMode: "ADVISOR_DISCOVERY" }) }));
  const matches = (probe: string) => catalog.filter(item => `${item.id}\n${item.name}`.toUpperCase().includes(probe.toUpperCase()));
  const rawIds = new Set(advisor.rawScopeCandidates.map(value => value.candidateId));
  const relevantById = new Map(advisor.frontierCandidates.map(value => [value.candidate.id, value]));
  const trace = (item: (typeof catalog)[number]) => {
    const base = traceCandidateCoverage({ item, profile, catalog, quotes, budgetCoins }), frontier = relevantById.get(item.id);
    const presentInRawAdvisorScope = rawIds.has(item.id), goalRelevant = frontier !== undefined, frontierSelected = frontier?.selection.selected ?? false;
    const advisorOutcome = !base.presentInAdvisorDiscovery ? base.exclusionReason
      : !presentInRawAdvisorScope ? "Discovery candidate was outside the active raw scope."
        : !goalRelevant ? advisor.diagnostics.removedByRelevance.find(value => value.id === item.id)?.reason ?? "Removed by goal relevance."
          : frontierSelected ? "Selected by the progression frontier." : frontier.selection.reason;
    return { ...base, presentInRawAdvisorScope, rawAdvisorPresence: presentInRawAdvisorScope, goalRelevant, frontierSelected, advisorOutcome,
      frontierBucket: frontier?.selection.bucket ?? null, frontierExclusionReason: frontier?.selection.exclusionReason ?? null };
  };
  const phase3ArmorIds = uniqueIds(armorBuilds.flatMap(result => Object.values(result.lanes).flat()));
  const phase3WeaponIds = uniqueIds(weaponBuilds.flatMap(({ result }) => Object.values(result.lanes).flat()));
  const discoveryArmorIds = uniqueIds(armorBuilds.flatMap(result => result.discovery.candidates));
  const discoveryWeaponIds = uniqueIds(weaponBuilds.flatMap(({ result }) => result.discovery.candidates));
  return {
    input: { username, requestedProfile, budgetCoins, probes },
    pipeline: {
      armor: ["catalog armor + recognized slot", "pair with equipped item in that slot", "prepareCandidate in ADVISOR_DISCOVERY mode", "known stat must improve", "fork into capped Phase 3 lanes and uncapped advisor discovery", "discovery lane enters raw GEAR scope"],
      weapon: ["catalog weapon + recognized subtype", "pair with each current compatible weapon subtype", "prepareCandidate in ADVISOR_DISCOVERY mode", "known stat improves or ability text exists", "fork into capped Phase 3 lanes and uncapped advisor discovery", "discovery lane enters raw GEAR scope"],
      armorSetBonusNomination: false,
      weaponAbilityTextNomination: true,
    },
    categoryCoverage: catalogCoverageSummary(catalog),
    currentBaselines: {
      armor: profile.gear.armor.items.map(item => ({ id: item.id, name: item.name, slot: item.categories.find(category => ["helmet", "chestplate", "leggings", "boots"].includes(category)) ?? null })),
      weapons: profile.gear.weapons.map(item => ({ id: item.id, name: item.name, type: item.categories.find(category => ["sword", "bow", "wand", "fishing_rod"].includes(category)) ?? null })),
    },
    counts: {
      catalogConsidered: catalog.filter(item => item.categories.includes("armor") || item.categories.includes("weapon")).length,
      phase3CappedUnique: { armor: phase3ArmorIds.length, weapons: phase3WeaponIds.length, total: new Set([...phase3ArmorIds, ...phase3WeaponIds]).size },
      advisorDiscoveryUnique: { armor: discoveryArmorIds.length, weapons: discoveryWeaponIds.length, total: new Set([...discoveryArmorIds, ...discoveryWeaponIds]).size },
      scoped: advisor.diagnostics.rawActiveScopeCandidateCount, goalRelevant: advisor.diagnostics.goalRelevantCandidateCount,
      frontierFinal: advisor.detailedCandidates.length,
    },
    phase3CappedLanes: {
      armor: armorBuilds.map(result => ({ slot: result.slot, counts: laneCounts(result.lanes) })),
      weapons: weaponBuilds.map(({ current, result }) => ({ current, counts: laneCounts(result.lanes) })),
    },
    advisor: { question, route: advisor.route, bucketDistribution: advisor.diagnostics.selectedBucketCounts,
      exclusionCounts: advisor.diagnostics.exclusionCounts, finalDetailedIds: advisor.detailedCandidates.map(value => value.id) },
    probes: Object.fromEntries(probes.map(probe => [probe, { matchCount: matches(probe).length, items: matches(probe).map(trace) }])),
    controls: controlIds.map(id => catalog.find(item => item.id === id)).filter(item => item !== undefined).map(trace),
  };
}

function uniqueIds(candidates: Array<{ id: string }>) { return [...new Set(candidates.map(value => value.id))]; }
function laneCounts(lanes: Record<string, readonly unknown[]>) { return Object.fromEntries(Object.entries(lanes).map(([lane, values]) => [lane, values.length])); }

async function main() {
  const [username = "iTimess", requestedProfile = "Lemon", rawBudget = "30000000", ...rawProbes] = process.argv.slice(2);
  const result = await buildCandidateTraceInspection({ username, requestedProfile, budgetCoins: Number(rawBudget), probes: rawProbes.length ? rawProbes : ["NECRON", "MIDAS"] });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main().catch(error => { console.error(error instanceof Error ? error.message : "Candidate trace failed."); process.exitCode = 1; });
