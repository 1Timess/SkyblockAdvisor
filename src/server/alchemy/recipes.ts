export interface PotionRecipe {
  potionId: string; basePotion: "WATER_BOTTLE" | "AWKWARD_POTION"; ingredientName: string; ingredientId: string;
  resultingLevel: number; alchemyXpPerPotion: number | null; evidence: "VERIFIED";
}

export const potionRecipes: readonly PotionRecipe[] = [
  { potionId: "HASTE", basePotion: "AWKWARD_POTION", ingredientName: "Coal", ingredientId: "COAL", resultingLevel: 1, alchemyXpPerPotion: 5, evidence: "VERIFIED" },
  { potionId: "SPELUNKER", basePotion: "WATER_BOTTLE", ingredientName: "Mithril", ingredientId: "MITHRIL_ORE", resultingLevel: 1, alchemyXpPerPotion: null, evidence: "VERIFIED" },
  { potionId: "COLD_RESISTANCE", basePotion: "AWKWARD_POTION", ingredientName: "Enchanted Glacite", ingredientId: "ENCHANTED_GLACITE", resultingLevel: 1, alchemyXpPerPotion: null, evidence: "VERIFIED" },
  { potionId: "SPEED", basePotion: "AWKWARD_POTION", ingredientName: "Sugar", ingredientId: "SUGAR", resultingLevel: 1, alchemyXpPerPotion: 5, evidence: "VERIFIED" },
  { potionId: "SPEED", basePotion: "AWKWARD_POTION", ingredientName: "Enchanted Sugar", ingredientId: "ENCHANTED_SUGAR", resultingLevel: 3, alchemyXpPerPotion: 300, evidence: "VERIFIED" },
  { potionId: "SPEED", basePotion: "AWKWARD_POTION", ingredientName: "Enchanted Sugar Cane", ingredientId: "ENCHANTED_SUGAR_CANE", resultingLevel: 5, alchemyXpPerPotion: 15000, evidence: "VERIFIED" },
  { potionId: "WEAKNESS", basePotion: "WATER_BOTTLE", ingredientName: "Fermented Spider Eye", ingredientId: "FERMENTED_SPIDER_EYE", resultingLevel: 1, alchemyXpPerPotion: 10, evidence: "VERIFIED" },
  { potionId: "WEAKNESS", basePotion: "WATER_BOTTLE", ingredientName: "Enchanted Fermented Spider Eye", ingredientId: "ENCHANTED_FERMENTED_SPIDER_EYE", resultingLevel: 5, alchemyXpPerPotion: 15000, evidence: "VERIFIED" },
  { potionId: "STRENGTH", basePotion: "AWKWARD_POTION", ingredientName: "Blaze Powder", ingredientId: "BLAZE_POWDER", resultingLevel: 1, alchemyXpPerPotion: 10, evidence: "VERIFIED" },
  { potionId: "STRENGTH", basePotion: "AWKWARD_POTION", ingredientName: "Enchanted Blaze Powder", ingredientId: "ENCHANTED_BLAZE_POWDER", resultingLevel: 3, alchemyXpPerPotion: 500, evidence: "VERIFIED" },
  { potionId: "STRENGTH", basePotion: "AWKWARD_POTION", ingredientName: "Enchanted Blaze Rod", ingredientId: "ENCHANTED_BLAZE_ROD", resultingLevel: 5, alchemyXpPerPotion: 23000, evidence: "VERIFIED" },
] as const;

export function recipesForPotion(potionId: string): PotionRecipe[] {
  return potionRecipes.filter(recipe => recipe.potionId === potionId.toUpperCase());
}
