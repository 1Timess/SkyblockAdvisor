export interface PotionRecipe {
  potionId: string; basePotion: "WATER_BOTTLE" | "AWKWARD_POTION"; ingredientName: string; ingredientId: string;
  resultingLevel: number; alchemyXpPerPotion: number | null; evidence: "VERIFIED";
}

export const potionRecipes: readonly PotionRecipe[] = [
  { potionId: "ABSORPTION", basePotion: "AWKWARD_POTION", ingredientName: "Gold Ingot", ingredientId: "GOLD_INGOT", resultingLevel: 1, alchemyXpPerPotion: 5, evidence: "VERIFIED" },
  { potionId: "ADRENALINE", basePotion: "AWKWARD_POTION", ingredientName: "Cocoa Beans", ingredientId: "INK_SACK:3", resultingLevel: 1, alchemyXpPerPotion: 5, evidence: "VERIFIED" },
  { potionId: "AGILITY", basePotion: "AWKWARD_POTION", ingredientName: "Enchanted Cake", ingredientId: "ENCHANTED_CAKE", resultingLevel: 1, alchemyXpPerPotion: 400, evidence: "VERIFIED" },
  { potionId: "BURNING", basePotion: "AWKWARD_POTION", ingredientName: "Red Sand", ingredientId: "SAND:1", resultingLevel: 1, alchemyXpPerPotion: 5, evidence: "VERIFIED" },
  { potionId: "DODGE", basePotion: "AWKWARD_POTION", ingredientName: "Raw Salmon", ingredientId: "RAW_FISH:1", resultingLevel: 1, alchemyXpPerPotion: 5, evidence: "VERIFIED" },
  { potionId: "EXPERIENCE", basePotion: "AWKWARD_POTION", ingredientName: "Lapis Lazuli", ingredientId: "INK_SACK:4", resultingLevel: 1, alchemyXpPerPotion: 5, evidence: "VERIFIED" },
  { potionId: "KNOCKBACK", basePotion: "AWKWARD_POTION", ingredientName: "Slimeball", ingredientId: "SLIME_BALL", resultingLevel: 1, alchemyXpPerPotion: 10, evidence: "VERIFIED" },
  { potionId: "MANA", basePotion: "AWKWARD_POTION", ingredientName: "Raw Mutton", ingredientId: "MUTTON", resultingLevel: 1, alchemyXpPerPotion: 5, evidence: "VERIFIED" },
  { potionId: "RABBIT", basePotion: "AWKWARD_POTION", ingredientName: "Raw Rabbit", ingredientId: "RABBIT", resultingLevel: 1, alchemyXpPerPotion: null, evidence: "VERIFIED" },
  { potionId: "RESISTANCE", basePotion: "AWKWARD_POTION", ingredientName: "Cactus", ingredientId: "CACTUS", resultingLevel: 1, alchemyXpPerPotion: 10, evidence: "VERIFIED" },
  { potionId: "STUN", basePotion: "WATER_BOTTLE", ingredientName: "Obsidian", ingredientId: "OBSIDIAN", resultingLevel: 1, alchemyXpPerPotion: 15, evidence: "VERIFIED" },
  { potionId: "VENOMOUS", basePotion: "WATER_BOTTLE", ingredientName: "Poisonous Potato", ingredientId: "POISONOUS_POTATO", resultingLevel: 1, alchemyXpPerPotion: 20, evidence: "VERIFIED" },
  { potionId: "WOUNDED", basePotion: "WATER_BOTTLE", ingredientName: "Netherrack", ingredientId: "NETHERRACK", resultingLevel: 1, alchemyXpPerPotion: 5, evidence: "VERIFIED" },
  { potionId: "CRITICAL", basePotion: "AWKWARD_POTION", ingredientName: "Flint", ingredientId: "FLINT", resultingLevel: 1, alchemyXpPerPotion: 10, evidence: "VERIFIED" },
  { potionId: "ARCHERY", basePotion: "AWKWARD_POTION", ingredientName: "Feather", ingredientId: "FEATHER", resultingLevel: 1, alchemyXpPerPotion: 10, evidence: "VERIFIED" },
  { potionId: "PET_LUCK", basePotion: "AWKWARD_POTION", ingredientName: "Enchanted Rabbit Hide", ingredientId: "ENCHANTED_RABBIT_HIDE", resultingLevel: 1, alchemyXpPerPotion: null, evidence: "VERIFIED" },
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
