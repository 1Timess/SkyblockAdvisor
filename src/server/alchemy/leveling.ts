export interface AlchemyLevelingMethod {
  id: string; potion: string; resultingLevel: number; ingredientName: string; marketKey: string;
  xpPerPotion: number; xpPerBatch: number; basePotion: string; evidence: "WIKI_TABLE" | "WIKI_PLUS_CURRENT_FORUM_RECIPE";
  notes: string[];
}

export const alchemyLevelingMethods: readonly AlchemyLevelingMethod[] = [
  { id: "SPEED_V_ENCHANTED_SUGAR_CANE", potion: "Speed", resultingLevel: 5, ingredientName: "Enchanted Sugar Cane",
    marketKey: "ENCHANTED_SUGAR_CANE", xpPerPotion: 15000, xpPerBatch: 45000, basePotion: "Awkward Potion",
    evidence: "WIKI_TABLE", notes: ["Potion-level modifiers after the XP-bearing ingredient do not increase the Alchemy XP reward."] },
  { id: "WEAKNESS_V_ENCHANTED_FERMENTED_SPIDER_EYE", potion: "Weakness", resultingLevel: 5,
    ingredientName: "Enchanted Fermented Spider Eye", marketKey: "ENCHANTED_FERMENTED_SPIDER_EYE",
    xpPerPotion: 15000, xpPerBatch: 45000, basePotion: "Water Bottle", evidence: "WIKI_TABLE",
    notes: ["Potion-level modifiers after the XP-bearing ingredient do not increase the Alchemy XP reward."] },
  { id: "STRENGTH_V_ENCHANTED_BLAZE_ROD", potion: "Strength", resultingLevel: 5, ingredientName: "Enchanted Blaze Rod",
    marketKey: "ENCHANTED_BLAZE_ROD", xpPerPotion: 23000, xpPerBatch: 69000, basePotion: "Awkward Potion",
    evidence: "WIKI_PLUS_CURRENT_FORUM_RECIPE", notes: ["Current 2026 Hypixel forum recipe corroborates Enchanted Blaze Rod -> Strength V."] },
] as const;

export function effectiveAlchemyXp(baseXp: number, confirmedWisdom: number, externalSkillXpMultiplier = 1): number {
  return baseXp * (1 + Math.max(0, confirmedWisdom) / 100) * Math.max(0, externalSkillXpMultiplier);
}
