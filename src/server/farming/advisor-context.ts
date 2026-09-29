import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { buildGardenProgress } from "./garden-progress";
import unlocks from "../reference/garden-unlocks.json";
import { buildObservedFarmingState } from "./observed-state";

export function buildFarmingAdvisorContext(profile: NormalizedSkyBlockProfile, rawGarden: unknown): AdvisorDomainContext {
  const progress = buildGardenProgress(rawGarden);
  return {
    domain: "FARMING", ...buildObservedFarmingState(profile), farmingLevel: profile.progression.skills.farming?.level ?? null,
    farmingXp: profile.progression.skills.farming?.xp ?? null,
    gardenAvailable: progress.available, gardenXp: progress.gardenXp, gardenLevel: progress.gardenLevel,
    nextGardenLevel: progress.nextGardenLevel, totalOffersAccepted: progress.totalOffersAccepted,
    uniqueVisitorsServed: progress.uniqueVisitorsServed, nextOffersMilestone: progress.nextOffersMilestone,
    nextUniqueVisitorsMilestone: progress.nextUniqueVisitorsMilestone,
    resourcesCollected: progress.resourcesCollected, cropUpgradeLevels: progress.cropUpgradeLevels,
    unlockedPlotIds: progress.unlockedPlotIds,
    greenhouseSlotObservation: progress.greenhouseSlotObservation,
    greenhouseEligibility: progress.gardenLevel === null ? null : progress.gardenLevel >= unlocks.greenhouseEligibilityLevel,
    nextGardenCropUnlocks: progress.nextGardenLevel
      ? unlocks.cropsByLevel[String(progress.nextGardenLevel.level) as keyof typeof unlocks.cropsByLevel] ?? [] : [],
    activeOffers: progress.activeOffers.slice(0, 8), activeOfferCount: progress.activeOffers.length,
    note: "Garden data is profile-wide. Crops collected do not imply a crop milestone tier or a collection unlock. Active visitor requirements do not establish inventory feasibility, price, or value. Current pests, planted crops, greenhouse completion, mutation discovery, contest ranks, effective Farming Fortune, and missing wardrobe items are unreported.",
  };
}
