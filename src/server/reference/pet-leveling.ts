import petLevels from "./pet-levels.json";

const rarities = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const offsets: Record<string, number> = { common: 0, uncommon: 6, rare: 11, epic: 16, legendary: 20, mythic: 20 };
const dragons = new Set(["GOLDEN_DRAGON", "JADE_DRAGON", "ROSE_DRAGON"]);

export function effectivePetRarity(raw: string, heldItem?: string | null) {
  const rarity = raw.toLowerCase();
  const index = rarities.indexOf(rarity);
  return heldItem === "PET_ITEM_TIER_BOOST" && index >= 0 ? rarities[Math.min(index + 1, rarities.length - 1)] : rarity;
}

// Supplemental contract §8.6, including its full-loop XP-to-max accumulation.
export function getPetLevel(experience: number, rarity: string, petType: string) {
  const offset = petType === "BINGO" && rarities.slice(0, 5).includes(rarity) ? 0 : offsets[rarity];
  if (offset === undefined) return null;
  const maxLevel = dragons.has(petType) ? 200 : 100;
  const base = petLevels.slice(offset, Math.min(offset + maxLevel - 1, petLevels.length));
  const costs = [...base, ...(maxLevel === 200 ? Array<number>(maxLevel - 1 - base.length).fill(1886700) : [])];
  let level = 1, consumed = 0, currentXp = Math.floor(experience);
  for (let i = 0; i < maxLevel - 1; i++) {
    const cost = costs[i];
    if (cost === undefined) break;
    consumed += cost;
    if (consumed <= experience) { level++; currentXp = Math.floor(experience) - consumed; }
  }
  const xpForNext = costs[level - 1] ?? 0;
  return { level, maxLevel, xpCurrent: currentXp, xpForNext, progress: xpForNext ? currentXp / xpForNext : 0, experienceForMaxLevel: consumed };
}
