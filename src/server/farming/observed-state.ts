import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { inspectFarmingMechanics } from "./mechanics-inspection";
import { farmingToolCrop } from "./tool-progress";

/** Member-specific history and visible items. No contest rank or missing-gear inference. */
export function buildObservedFarmingState(profile: NormalizedSkyBlockProfile) {
  const observation = inspectFarmingMechanics(profile);
  return {
    contestCount: observation.contests.count,
    medalInventory: observation.contests.medalInventory,
    observedPestKills: observation.pestHistory.killStats,
    visibleEquipmentCount: observation.visibleGear.totalMatches,
    visibleEquipment: observation.visibleGear.items.slice(0, 16).map(item => ({ id: item.id, name: item.name, source: item.source,
      reforge: item.reforge, enchantments: item.enchantments, farmingFortune: item.stats.farmingFortune ?? null,
      toolProgress: item.farmingToolProgress ?? null,
      levelingCrop: item.farmingToolProgress ? farmingToolCrop(item.id) : null })),
    inventoryApiLimited: observation.inventoryWarnings.length > 0,
  };
}
