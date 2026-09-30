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
export const treeToughness = { FIG: 10, MANGROVE: 50, HELIX: 150 } as const;
export const torrhusRequiredHotfTier = 4;


export const foragingTreeMechanics = {
  FIG: { toughness: 10, style: ["trunk", "branches"], giftContributionPercent: 10 },
  MANGROVE: { toughness: 50, style: ["branches", "trunk", "roots"], giftContributionPercent: 10 },
  HELIX: { toughness: 150, style: ["light_logs", "red_logs"], giftContributionPercent: null },
} as const;

export const throwingAxeMechanics = {
  allowedOnForagingIslands: true,
  normalLogBreakFraction: 0.5,
} as const;

export const currentFlatSweepChanges = {
  lottery: 10,
  agathaPowerPerRank: 5,
  agathaPowerMaxRank: 5,
  agathaPowerMaxSweep: 25,
  miriaPowerPerRank: 5,
  miriaPowerMaxRank: 5,
  miriaPowerMaxSweep: 25,
} as const;

export const centerOfForestVerifiedEffects = {
  2: { axeAbilityLevels: 1 },
  4: { treeGiftTracking: 5 },
} as const;

export const currentTreeGiftMilestoneSweepPerTier = 3;
export const halfFullEmptyScope = "island_wide" as const;

export const foragingLevelCapSources = {
  collectionTierNine: { FIG_LOG: 1, MANGROVE_LOG: 1, HELIX_LOG: 1 },
  agathaPrizeShop: 2,
  miriaPrizeShop: 2,
} as const;


export const currentTreeGiftXp = {
  FIG: { foragingXp: 100, hotfXp: 10 },
  MANGROVE: { foragingXp: 500, hotfXp: 20 },
  HELIX: { foragingXp: 1500, hotfXp: 30 },
} as const;

export const currentGalateaNpcLogPrices = { FIG: 8, MANGROVE: 14, HELIX: 20 } as const;

export const verifiedForagingGearSweep = {
  SERIOUSLY_DAMAGED_AXE: 10,
  FIG_HEW: 15,
  FIGSTONE_SPLITTER: 25,
  FIG_ARMOR_PER_PIECE: 10,
  HELIX_ARMOR_PER_PIECE: 20,
  HELIX_CHOPPER: 50,
  FROG_PET_BASE: 10,
  SLOTH_PET_BASE: 25,
} as const;

export const starlynContestPointBonuses = {
  MOONGLADE_BELT_PERCENT: 5,
  TORRHUS_BELT_PERCENT: 10,
} as const;
