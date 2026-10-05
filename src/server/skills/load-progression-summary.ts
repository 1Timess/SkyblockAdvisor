import "server-only";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import type { MarketQuote } from "../../schemas/market";
import type { SkillCandidateEvidence } from "./progression-summary";
import { hypixelClient } from "../hypixel/client";
import { loadMarketSnapshot } from "../market/snapshot-store";
import { loadNeuRepository } from "../reference/neu/repository";
import { loadNeuPetConstants } from "../reference/neu/pets";
import { buildItemCatalog } from "../reference/item-catalog";
import { buildPetCandidateCatalog } from "../reference/pet-catalog";
import { buildCanonicalPetDefinitions, buildCanonicalPetItemDefinitions } from "../reference/pet-mechanics";
import { buildOwnedPetSetups } from "../pets/owned-setups";
import { buildActivityDomainLanes } from "../candidates/domain";
import { buildActivityPetLanes } from "../candidates/activity-pets";
import { buildForagingUpgradeLanes } from "../foraging/upgrade-lanes";
import { buildGardenProgress } from "../farming/garden-progress";
import { buildFarmingEquipmentComparisons } from "../farming/equipment-comparisons";
import { buildSkillProgressionSummaries, type SkillProgressionSummary } from "./progression-summary";

export async function loadSkillProgressionSummaries(
  profile: NormalizedSkyBlockProfile,
  budgetCoins?: number,
): Promise<Record<string, SkillProgressionSummary>> {
  const [neu, petConstants, items, market] = await Promise.all([
    loadNeuRepository(), loadNeuPetConstants(), hypixelClient.getItems(), loadMarketSnapshot().catch(() => null),
  ]);
  const definitions = buildCanonicalPetDefinitions(neu.getAll(), petConstants);
  const petItems = buildCanonicalPetItemDefinitions(neu.getAll(), petConstants);
  const setups = buildOwnedPetSetups({ pets: profile.pets.owned, definitions, petItems });
  const catalog = buildItemCatalog(items, neu).getAll();
  const quotes = new Map<string, MarketQuote>(Object.entries(market?.quotes ?? {}));
  const petCatalog = buildPetCandidateCatalog(neu);

  const evidence: Partial<Record<string, SkillCandidateEvidence[]>> = {};
  const domainEvidence: Parameters<typeof buildSkillProgressionSummaries>[3] = {};
  for (const domain of ["MINING", "FISHING"] as const) {
    const itemLanes = buildActivityDomainLanes({ domain, profile, catalog, quotes, budgetCoins });
    const petLanes = buildActivityPetLanes({ domain, setups, definitions, petItems, catalog: petCatalog });
    evidence[domain.toLowerCase()] = [...laneEvidence(domain.toLowerCase(), itemLanes), ...laneEvidence(domain.toLowerCase(), petLanes)];
  }

  const foragingItems = buildForagingUpgradeLanes({ profile, catalog, quotes, budgetCoins });
  const foragingPets = buildActivityPetLanes({ domain: "FORAGING", setups, definitions, petItems, catalog: petCatalog });
  evidence.foraging = [...laneEvidence("foraging", foragingItems), ...laneEvidence("foraging", foragingPets)];

  const rawGarden = await hypixelClient.getGarden(profile.profile.id).catch(() => null);
  const garden = buildGardenProgress(rawGarden);
  const farmingEquipment = buildFarmingEquipmentComparisons(profile, catalog, neu, quotes, garden.gardenLevel);
  domainEvidence.farming = { farming: {
    gardenAvailable: garden.available, gardenLevel: garden.gardenLevel, gardenXp: garden.gardenXp,
    nextGardenLevel: garden.nextGardenLevel, nextCropMilestones: garden.nextCropMilestones,
    equipmentComparisons: farmingEquipment.comparisons,
  } };

  for (const domain of ["FARMING", "COMBAT"] as const) {
    const petLanes = buildActivityPetLanes({ domain, setups, definitions, petItems, catalog: petCatalog });
    evidence[domain.toLowerCase()] = laneEvidence(domain.toLowerCase(), petLanes);
  }

  return buildSkillProgressionSummaries(profile, { setups, definitions, petItems }, evidence, domainEvidence);
}

function laneEvidence(prefix: string, lanes: Record<string, import("../../schemas/candidates").AdvisorCandidate[]>): SkillCandidateEvidence[] {
  return Object.entries(lanes).flatMap(([lane, candidates]) => candidates.map(candidate => ({ lane: `${prefix}:${lane}`, candidate })));
}
