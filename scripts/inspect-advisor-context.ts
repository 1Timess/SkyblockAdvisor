import type { AdvisorCandidate } from "../src/schemas/candidates";
import type { MarketQuote } from "../src/schemas/market";
import { buildAdvisorContext, type CandidateLaneGroups } from "../src/server/advisor/context";
import { buildAccessoryLanes } from "../src/server/candidates/accessory";
import { buildArmorLanes } from "../src/server/candidates/armor";
import { buildPetLanes } from "../src/server/candidates/pet";
import { buildWeaponLanes } from "../src/server/candidates/weapon";
import { hypixelClient } from "../src/server/hypixel/client";
import { loadMarketSnapshot } from "../src/server/market/snapshot-store";
import { buildAccessoryCatalog } from "../src/server/reference/accessory-data";
import { buildItemCatalog } from "../src/server/reference/item-catalog";
import { loadNeuRepository } from "../src/server/reference/neu/repository";
import { buildPetCandidateCatalog } from "../src/server/reference/pet-catalog";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";

async function main() {
  const [username = "iTimess", requestedProfile = "Lemon", rawBudget = "30000000", ...questionParts] = process.argv.slice(2);
  const budgetCoins = Number(rawBudget);
  if (!Number.isFinite(budgetCoins) || budgetCoins < 0) throw new Error("Budget must be a non-negative number of coins.");
  const question = questionParts.join(" ").trim() || "I just cleared F5 and have 30m coins. What should I upgrade next?";
  const [profile, items, neu, snapshot] = await Promise.all([
    buildNormalizedProfile({ usernameOrUuid: username, requestedProfile }),
    hypixelClient.getItems(), loadNeuRepository(), loadMarketSnapshot(),
  ]);
  const catalog = buildItemCatalog(items, neu).getAll(), petCatalog = buildPetCandidateCatalog(neu);
  const quotes = new Map<string, MarketQuote>(Object.entries(snapshot?.quotes ?? {}));
  const provenance = new Map<string, Set<string>>();
  const record = (label: string, lane: readonly AdvisorCandidate[]) => {
    for (const candidate of lane) provenance.set(candidate.id, new Set([...(provenance.get(candidate.id) ?? []), label]));
    return lane;
  };
  const armorResults = profile.gear.armor.items.map(current => buildArmorLanes({ current, catalog, profile, quotes, budgetCoins }));
  const weaponResults = profile.gear.weapons.map(current => ({ current: current.id ?? current.name,
    result: buildWeaponLanes({ current, catalog, profile, quotes, budgetCoins }) }));
  const accessoryResult = buildAccessoryLanes({ profile, catalog, references: buildAccessoryCatalog(items), quotes, budgetCoins });
  const petResult = buildPetLanes({ profile, catalog: petCatalog, quotes, budgetCoins });
  const groups: CandidateLaneGroups = {
    armor: armorResults.flatMap(result => Object.entries(result.lanes).map(([lane, candidates]) => record(`armor:${result.slot}:${lane}`, candidates))),
    weapon: weaponResults.flatMap(({ current, result }) => Object.entries(result.lanes).map(([lane, candidates]) => record(`weapon:${current}:${lane}`, candidates))),
    accessory: Object.entries(accessoryResult.lanes).map(([lane, candidates]) => record(`accessory:${lane}`, candidates)),
    pet: Object.entries(petResult.lanes).map(([lane, candidates]) => record(`pet:${lane}`, candidates)),
  };
  const context = buildAdvisorContext({ question, profile, candidateLanes: groups });
  console.log(JSON.stringify(context.candidates.map(candidate => ({
    candidateId: candidate.id,
    domain: candidate.domain,
    name: candidate.name,
    price: candidate.price,
    knownChanges: candidate.knownChanges,
    requirements: candidate.requirements,
    warnings: candidate.warnings,
    lanes: [...(provenance.get(candidate.id) ?? [])],
  })), null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Advisor context inspection failed."); process.exitCode = 1; });
