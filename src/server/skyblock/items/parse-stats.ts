import type { ItemStats } from "../../../schemas/items";

const labels: Record<string, string> = {
  Health: "health", Defense: "defense", Damage: "damage", Strength: "strength", "Crit Chance": "critChance", "Crit Damage": "critDamage",
  Intelligence: "intelligence", "Bonus Attack Speed": "attackSpeed", "Attack Speed": "attackSpeed", Ferocity: "ferocity", Speed: "speed",
  "Magic Find": "magicFind", "Pet Luck": "petLuck", "Ability Damage": "abilityDamage", "Sea Creature Chance": "seaCreatureChance",
  "Fishing Speed": "fishingSpeed", "Mining Speed": "miningSpeed", "Mining Fortune": "miningFortune", "Gemstone Fortune": "gemstoneFortune",
  "Cold Resistance": "coldResistance", "Farming Fortune": "farmingFortune", "Foraging Fortune": "foragingFortune", Pristine: "pristine",
};
export function extractStats(lore: string[]) {
  const stats: ItemStats = {};
  const unknown: string[] = [];
  for (const line of lore) {
    const match = line.match(/^([A-Za-z ]+): ([+-]\d[\d,]*(?:\.\d+)?)(%)?/);
    if (!match) continue;
    const key = labels[match[1]];
    if (!key) { unknown.push(match[1]); continue; }
    const value = Number(match[2].replaceAll(",", ""));
    if (Number.isFinite(value)) stats[key] = (stats[key] ?? 0) + value;
  }
  return { stats, unknown };
}
