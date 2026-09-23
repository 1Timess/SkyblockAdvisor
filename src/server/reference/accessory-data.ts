import type { AccessoryReference } from "../../schemas/normalized-profile";
import type { HypixelItemDefinition } from "../hypixel/types";
import { raritySchema } from "../../schemas/items";
import chains from "./accessory-chains.json";

export const accessoryChains: string[][] = chains;
export const mpByRarity: Record<string, number> = { common: 3, uncommon: 5, rare: 8, epic: 12, legendary: 16, mythic: 22, special: 3, very_special: 5 };
const aliases: Record<string, string> = {
  WEDDING_RING_1: "WEDDING_RING_0", WEDDING_RING_3: "WEDDING_RING_2", WEDDING_RING_5: "WEDDING_RING_4", WEDDING_RING_6: "WEDDING_RING_4", WEDDING_RING_8: "WEDDING_RING_7",
  PARTY_HAT_CRAB_ANIMATED: "PARTY_HAT_CRAB", PARTY_HAT_SLOTH: "PARTY_HAT_CRAB", BALLOON_HAT_2024: "PARTY_HAT_CRAB", BALLOON_HAT_2025: "PARTY_HAT_CRAB", CAKE_HAT_2026: "PARTY_HAT_CRAB",
  DANTE_RING: "DANTE_TALISMAN",
};
for (const prefix of ["CAMPFIRE_TALISMAN", "SOUL_CAMPFIRE_TALISMAN"]) {
  for (const [base, last] of [[1, 3], [4, 7], [8, 12], [13, 20], [21, 29]]) {
    for (let n = base + 1; n <= last; n++) aliases[`${prefix}_${n}`] = `${prefix}_${base}`;
  }
}
export function accessoryBaseId(id: string): string { return aliases[id] ?? id; }
export const accessoryExclusions = new Set(["BINGO_HEIRLOOM", "LUCK_TALISMAN", "TALISMAN_OF_SPACE", "RING_OF_SPACE", "MASTER_SKULL_TIER_8", "MASTER_SKULL_TIER_9", "MASTER_SKULL_TIER_10", "COMPASS_TALISMAN", "ARTIFACT_OF_SPACE", "GRIZZLY_PAW", "ETERNAL_CRYSTAL", "OLD_BOOT"]);
const specials: Record<string, Partial<AccessoryReference>> = {
  BOOK_OF_PROGRESSION: { allowedRarities: ["uncommon", "rare", "epic", "legendary", "mythic"], recombobulationAllowed: false, enrichmentAllowed: true },
  PANDORAS_BOX: { allowedRarities: ["uncommon", "rare", "epic", "legendary", "mythic"], recombobulationAllowed: false, enrichmentAllowed: true },
  TRAPPER_CREST: { allowedRarities: ["uncommon", "rare"], recombobulationAllowed: true, enrichmentAllowed: true },
  PULSE_RING: { allowedRarities: ["rare", "epic", "legendary"], recombobulationAllowed: true, enrichmentAllowed: true },
  POWER_RELIC: { rarity: "legendary", allowedRarities: ["legendary"], recombobulationAllowed: true, enrichmentAllowed: true },
  RIFT_PRISM: { recombobulationAllowed: false, enrichmentAllowed: true },
  HOCUS_POCUS_CIPHER: { recombobulationAllowed: true, enrichmentAllowed: false },
  RUNEBOOK: { recombobulationAllowed: false, enrichmentAllowed: true },
  VOTER_BADGE_SUPREME: { recombobulationAllowed: false, enrichmentAllowed: true },
  SAFETY_BADGE: { recombobulationAllowed: false, enrichmentAllowed: true },
};

export function buildAccessoryCatalog(items: HypixelItemDefinition[]): AccessoryReference[] {
  const catalog = new Map<string, AccessoryReference>();
  for (const item of items) {
    if (item.category?.toLowerCase() !== "accessory" || accessoryExclusions.has(item.id)) continue;
    const id = accessoryBaseId(item.id);
    if (catalog.has(id) && item.id !== id) continue;
    const rarity = raritySchema.safeParse(item.tier?.toLowerCase());
    catalog.set(id, { id, name: item.name, rarity: rarity.success ? rarity.data : null, ...specials[id] });
  }
  return [...catalog.values()];
}
