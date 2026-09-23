import { rarities, type ItemRarity } from "../../../schemas/items";

const types: Record<string, string[]> = {
  HELMET: ["armor", "helmet"], CHESTPLATE: ["armor", "chestplate"], LEGGINGS: ["armor", "leggings"], BOOTS: ["armor", "boots"],
  NECKLACE: ["equipment", "necklace"], CLOAK: ["equipment", "cloak"], BELT: ["equipment", "belt"], GLOVES: ["equipment", "gloves"], BRACELET: ["equipment", "bracelet"],
  SWORD: ["weapon", "sword"], BOW: ["weapon", "bow"], SHORTBOW: ["weapon", "bow"], LONGSWORD: ["weapon", "sword"], WAND: ["weapon", "wand"],
  ACCESSORY: ["accessory"], "FISHING ROD": ["tool", "fishing_rod"], "FISHING WEAPON": ["weapon", "fishing_rod"],
  PICKAXE: ["tool", "pickaxe"], DRILL: ["tool", "drill"], AXE: ["tool", "axe"], HOE: ["tool", "hoe"], SHOVEL: ["tool", "shovel"],
};

export function stripFormatting(value: string): string { return value.replace(/§[0-9a-fk-or]/gi, ""); }

export function parseFooter(lore: string[]): { rarity: ItemRarity | null; categories: string[] } {
  const rarityNames = [...rarities].sort((a, b) => b.length - a.length).map(r => r.replaceAll("_", " ").toUpperCase());
  const pattern = new RegExp(`^(?:a\\s+)?(${rarityNames.join("|")})(?:\\s+(.*?))?(?:\\s+a)?$`, "i");
  for (const line of [...lore].reverse()) {
    const match = line.trim().match(pattern);
    if (!match) continue;
    const rarity = match[1].toLowerCase().replaceAll(" ", "_") as ItemRarity;
    const itemType = (match[2] ?? "").toUpperCase().replace(/^DUNGEON\s+/, "").trim();
    return { rarity, categories: types[itemType] ?? [] };
  }
  return { rarity: null, categories: [] };
}
