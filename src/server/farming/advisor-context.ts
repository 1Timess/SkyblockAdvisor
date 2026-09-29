import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { buildGardenProgress } from "./garden-progress";
import unlocks from "../reference/garden-unlocks.json";
import { buildObservedFarmingState } from "./observed-state";
import { cropPestOptions, possibleGardenMechanics } from "../reference/farming-garden-mechanics";
import { greenhouseExpansionOptions, plotExpansionOptions } from "./plot-progress";

export function buildFarmingAdvisorContext(profile: NormalizedSkyBlockProfile, rawGarden: unknown): AdvisorDomainContext {
  const progress = buildGardenProgress(rawGarden);
  return {
    domain: "FARMING", ...buildObservedFarmingState(profile), ...possibleGardenMechanics(progress.gardenLevel),
    farmingLevel: profile.progression.skills.farming?.level ?? null,
    farmingXp: profile.progression.skills.farming?.xp ?? null,
    gardenAvailable: progress.available, gardenXp: progress.gardenXp, gardenLevel: progress.gardenLevel,
    nextGardenLevel: progress.nextGardenLevel, totalOffersAccepted: progress.totalOffersAccepted,
    uniqueVisitorsServed: progress.uniqueVisitorsServed, nextOffersMilestone: progress.nextOffersMilestone,
    nextUniqueVisitorsMilestone: progress.nextUniqueVisitorsMilestone,
    resourcesCollected: progress.resourcesCollected, nextCropMilestones: progress.nextCropMilestones,
    cropUpgradeLevels: progress.cropUpgradeLevels,
    unlockedPlotIds: progress.unlockedPlotIds,
    plotExpansionOptions: plotExpansionOptions(progress.unlockedPlotIds, progress.gardenLevel),
    greenhouseExpansionOptions: progress.gardenLevel !== null && progress.gardenLevel >= 7 ? greenhouseExpansionOptions.map(option => ({ ...option })) : [],
    cropPestOptions: cropPestOptions(progress.gardenLevel, progress.nextCropMilestones),
    greenhouseSlotObservation: progress.greenhouseSlotObservation,
    greenhouseEligibility: progress.gardenLevel === null ? null : progress.gardenLevel >= unlocks.greenhouseEligibilityLevel,
    nextGardenCropUnlocks: progress.nextGardenLevel
      ? unlocks.cropsByLevel[String(progress.nextGardenLevel.level) as keyof typeof unlocks.cropsByLevel] ?? [] : [],
    activeOffers: progress.activeOffers.slice(0, 8), activeOfferCount: progress.activeOffers.length,
    note: "Garden data is profile-wide. Crop milestone gaps use reported Garden resources_collected and current per-crop tables; absent crop keys are unreported. They do not imply collection unlocks or crop rates. Mutation options and pest unlocks are possible mechanics by Garden level, not observed access, planted layout, discovery, or active pests. Greenhouse access still requires the Carpenter offer and blueprint. Active visitor requirements do not establish inventory feasibility, price, or value. Contest ranks, effective Farming Fortune, and missing wardrobe items are unreported.",
  };
}
