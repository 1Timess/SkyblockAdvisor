import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { hypixelClient } from "../src/server/hypixel/client";
import { loadMarketSnapshot } from "../src/server/market/snapshot-store";
import { buildItemCatalog } from "../src/server/reference/item-catalog";
import { loadNeuRepository } from "../src/server/reference/neu/repository";
import { catalogCoverageSummary, traceCandidateCoverage } from "../src/server/candidates/trace";

const controlIds = ["STARRED_SHADOW_FURY", "FLOWER_OF_TRUTH", "GIANTS_SWORD", "BERSERKER_CHESTPLATE", "BURNING_TERROR_HELMET"];

export async function buildCandidateTraceInspection(input: { username: string; requestedProfile: string; budgetCoins: number; probes: string[] }) {
  const { username, requestedProfile, budgetCoins, probes } = input;
  if (!Number.isFinite(budgetCoins) || budgetCoins < 0) throw new Error("Budget must be a non-negative number of coins.");
  const [profile, items, neu, snapshot] = await Promise.all([
    buildNormalizedProfile({ usernameOrUuid: username, requestedProfile }), hypixelClient.getItems(), loadNeuRepository(), loadMarketSnapshot(),
  ]);
  const catalog = buildItemCatalog(items, neu).getAll(), quotes = new Map(Object.entries(snapshot?.quotes ?? {}));
  const matches = (probe: string) => catalog.filter(item => `${item.id}\n${item.name}`.toUpperCase().includes(probe.toUpperCase()));
  const trace = (item: (typeof catalog)[number]) => traceCandidateCoverage({ item, profile, catalog, quotes, budgetCoins });
  return {
    input: { username, requestedProfile, budgetCoins, probes },
    pipeline: {
      armor: ["catalog armor + recognized slot", "pair with equipped item in that slot", "prepareCandidate in ADVISOR_DISCOVERY mode", "known stat must improve", "rank within top six of a stat lane", "lane enters raw GEAR scope"],
      weapon: ["catalog weapon + recognized subtype", "pair with each current compatible weapon subtype", "prepareCandidate in ADVISOR_DISCOVERY mode", "known stat improves or ability text exists", "rank within top six of a stat/ability lane", "lane enters raw GEAR scope"],
      armorSetBonusNomination: false,
      weaponAbilityTextNomination: true,
    },
    categoryCoverage: catalogCoverageSummary(catalog),
    probes: Object.fromEntries(probes.map(probe => [probe, { matchCount: matches(probe).length, items: matches(probe).map(trace) }])),
    controls: controlIds.map(id => catalog.find(item => item.id === id)).filter(item => item !== undefined).map(trace),
  };
}

async function main() {
  const [username = "iTimess", requestedProfile = "Lemon", rawBudget = "30000000", ...rawProbes] = process.argv.slice(2);
  const result = await buildCandidateTraceInspection({ username, requestedProfile, budgetCoins: Number(rawBudget), probes: rawProbes.length ? rawProbes : ["NECRON", "MIDAS"] });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main().catch(error => { console.error(error instanceof Error ? error.message : "Candidate trace failed."); process.exitCode = 1; });
