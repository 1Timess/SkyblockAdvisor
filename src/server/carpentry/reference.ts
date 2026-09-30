export const CARPENTRY_CAP = 50;
export const CARPENTRY_XP_RATE = 0.03;

export const carpentryMechanics = {
  unlock: { npc: "Carpenter", requirement: "Give the Carpenter 64 Wool.", carpentryTableUnlocked: true },
  xp: {
    ingredientNpcSellValueRate: CARPENTRY_XP_RATE,
    requiresThreeByThreeCrafting: true,
    inventoryTwoByTwoAwardsXp: false,
    mostVanillaRecipesAwardXp: false,
    formula: "Carpentry XP = 3% of the combined NPC sell value of eligible recipe ingredients.",
  },
  quickCrafting: {
    carpentryLevel: 3,
    note: "Quick Crafting unlocks at Carpentry III, but use can still depend on account/rank availability that is not normalized.",
  },
  furniture: {
    finalUnlockLevel: 25,
    note: "Furniture recipe rewards are concentrated through Carpentry 25; levels 26-50 do not add further furniture recipes.",
  },
  rewards: { healthPerLevel: 1 },
} as const;
