export const hotfCumulativeXp = [0, 3_000, 12_000, 37_000, 97_000, 197_000, 347_000, 547_000] as const;

export function hotfLevelFromXp(xp: number | null | undefined): number | null {
  if (xp === null || xp === undefined) return null;
  const normalized = Math.max(0, Math.floor(xp));
  let tier = 1;
  for (let index = 1; index < hotfCumulativeXp.length; index++) {
    if (normalized < hotfCumulativeXp[index]) break;
    tier = index + 1;
  }
  return tier;
}

export const hotfTierNodes = {
  1: ["sweep"],
  2: ["damage_boost", "luck_of_the_forest", "foraging_fortune", "collector", "axe_toss"],
  3: ["deep_waters", "hunters_luck", "galateas_might"],
  4: ["lottery", "foraging_madness", "iron_lungs", "250_gifts", "daily_wishes", "early_bird", "precision_cutting"],
  5: ["tree_whisperer", "center_of_the_forest", "free_trial"],
  6: ["homing_axe", "forest_fisher", "strength_boost", "starlyn_supreme", "speed_boost", "efficient_forager", "maniac_slicer"],
  7: ["half_empty", "ricochet", "half_full"],
  8: ["monster_hunter", "forest_speed", "essence_fortune", "timber", "two_for_one", "forest_strength", "beekeeper"],
} as const;

export const hotfWhisperCurrencyByTier = {
  1: "forest", 2: "forest", 3: "forest", 4: "desert", 5: "desert", 6: "desert", 7: "desert", 8: "desert",
} as const;

export const treeGiftMilestones = [10, 25, 100, 250, 500, 1_000, 2_500] as const;
export const treeGiftHotfXp = { FIG: 10, MANGROVE: 20, HELIX: 30 } as const;
export const treeToughness = { FIG: 10, HELIX: 150 } as const;
export const torrhusRequiredHotfTier = 4;
