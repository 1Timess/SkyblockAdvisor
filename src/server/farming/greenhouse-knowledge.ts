/** Current Greenhouse reference mechanics. The API observations do not report the inputs for a player timer. */
export function greenhouseMechanics() {
  return {
    baseStageSeconds: 14400,
    growth: { offline: true, uniqueBaseCropCountCap: 12, uniqueBaseCropSpeedPercentEach: 2.5,
      cropGrowthSpeedPercentPerPoint: 0.25, growthSpeedUpgradeMaxLevel: 9,
      growthSpeedUpgradePercent: "5% per level through 8; 50% at 9",
      greenhouseSpeedAttributePercentPerPoint: 0.1 },
    water: { lossPerStageMin: 2, lossPerStageMax: 3, dryStageCanStall: true },
    yield: { uniqueBaseCropPercentEach: 3, plantYieldUpgradeMaxLevel: 9,
      plantYieldUpgradePercent: "2% per level through 8; 20% at 9",
      nearbyEffectsLockOnMaturity: true },
    adjacency: "ORTHOGONAL_ONLY" as const,
    unlocks: { carpenterOfferThenBlueprintHandoff: true, plotLimit: 3,
      vinesPerAdjacentCropSlot: 1, additionalGreenhousesHaveAllSlots: true,
      mutationHarvestCanDropEtherealVine: true, allCropSlotsBeforeExpansion: true },
    vineDropChancePercentByMutationRarity: { COMMON: 15, UNCOMMON: 20, RARE: 25, EPIC: 30, LEGENDARY: 40 },
    bonusDropsVineChancePercent: 5,
    profileTimerStatus: "UNREPORTED" as const,
    profileWaterAndEffectsStatus: "UNREPORTED" as const,
  };
}
