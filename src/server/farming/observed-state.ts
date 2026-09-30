import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { inspectFarmingMechanics } from "./mechanics-inspection";
import { farmingToolCrop, nextFarmingToolLevel } from "./tool-progress";

export function turboCropChecks(items: readonly { id: string | null; name: string; source: string; enchantments: Record<string, number> }[]) {
  return items.flatMap(item => Object.entries(item.enchantments).flatMap(([enchantment, level]) => {
    if (!/^turbo_[a-z_]+$/.test(enchantment) || (level !== 4 && level !== 5)) return [];
    return [{ itemId: item.id, itemName: item.name, source: item.source, enchantment, level,
      requiredBracket: level === 4 ? "BRONZE" as const : "SILVER" as const,
      eligibilityStatus: "UNREPORTED" as const }];
  })).slice(0, 16);
}

/** Member-specific history and visible items. No contest rank or missing-gear inference. */
export function buildObservedFarmingState(profile: NormalizedSkyBlockProfile) {
  const observation = inspectFarmingMechanics(profile);
  return {
    contestCount: observation.contests.count,
    medalInventory: observation.contests.medalInventory,
    contestPerkLevels: observation.contests.perkLevels,
    uniqueContestBracketKeys: observation.contests.uniqueBracketKeys,
    personalBestCropKeys: observation.contests.personalBestKeys,
    observedPestKills: observation.pestHistory.killStats,
    turboCropChecks: turboCropChecks(observation.visibleGear.items),
    visibleEquipmentCount: observation.visibleGear.totalMatches,
    visibleEquipment: observation.visibleGear.items.slice(0, 16).map(item => ({ id: item.id, name: item.name, source: item.source,
      reforge: item.reforge, enchantments: item.enchantments, farmingFortune: item.stats.farmingFortune ?? null,
      toolProgress: item.farmingToolProgress ?? null,
      levelingCrop: item.farmingToolProgress ? farmingToolCrop(item.id) : null,
      nextToolLevel: item.farmingToolProgress ? nextFarmingToolLevel(item.farmingToolProgress) : null })),
    inventoryApiLimited: observation.inventoryWarnings.length > 0,
  };
}
