/** Plot prices advance within each Garden-level tier, not by the plot's visible number. */
const tiers = [
  { apiPrefix: "beginner", gardenLevel: 1, costs: [1, 2, 4, 8], currency: "COMPOST" },
  { apiPrefix: "intermediate", gardenLevel: 3, costs: [16, 24, 32, 48], currency: "COMPOST" },
  { apiPrefix: "advanced", gardenLevel: 5, costs: [64, 96, 128, 160, 160, 320, 320, 480, 480, 640, 800, 1120], currency: "COMPOST" },
  { apiPrefix: "expert", gardenLevel: 7, costs: [1280, 1600, 1920, 2400], currency: "COMPOST" },
] as const;

// The game's table uses Compost Bundles after 11 tier-C plots (1 bundle = 160 Compost).
// Counts are computed from API group prefixes seen in live profiles; uncertain mappings stay labelled.
export function plotExpansionOptions(ids: string[], gardenLevel: number | null) {
  if (gardenLevel === null) return [];
  const unique = [...new Set(ids)];
  if (unique.some(id => !tiers.some(tier => new RegExp(`^${tier.apiPrefix}_[0-9]+$`).test(id)))) return [];
  return tiers.flatMap(tier => {
    const matching = unique.filter(id => new RegExp(`^${tier.apiPrefix}_[0-9]+$`).test(id));
    if (matching.length >= tier.costs.length || gardenLevel < tier.gardenLevel) return [];
    const compost = tier.costs[matching.length];
    return [{ group: tier.apiPrefix, unlockedInGroup: matching.length, totalInGroup: tier.costs.length,
      gardenLevelRequired: tier.gardenLevel, cost: compost >= 160 && compost % 160 === 0
        ? { item: "COMPOST_BUNDLE" as const, amount: compost / 160 } : { item: "COMPOST" as const, amount: compost },
      mapping: "INFERRED_API_GROUP" as const }];
  });
}

export const greenhouseExpansionOptions = [
  { greenhouseNumber: 2, etherealVines: 100, compostBundles: 10 },
  { greenhouseNumber: 3, etherealVines: 150, compostBundles: 20 },
] as const;
