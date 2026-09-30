export interface BrewReference { name: string; effect: string; affectedPotions: string[]; source: string; }
export const brews: readonly BrewReference[] = [
  { name: "Cheap Coffee", effect: "Adds +5 Speed to potions with Speed.", affectedPotions: ["ADRENALINE","AGILITY","RABBIT","SPEED"], source: "Bartender" },
  { name: "Tepid Green Tea", effect: "Buffs the Defense value of Resistance potions by 10%.", affectedPotions: ["RESISTANCE"], source: "Bartender" },
  { name: "Pulpous Orange Juice", effect: "Buffs the Health value of applicable potions by 5%.", affectedPotions: ["EXPERIENCE"], source: "Joyful Viking" },
  { name: "Tutti-Frutti Flavored Poison", effect: "Adds 5% to Archery Potion damage.", affectedPotions: ["ARCHERY"], source: "Shifty" },
  { name: "Dctr. Paper", effect: "Adds 75 Absorption to applicable potions.", affectedPotions: ["ABSORPTION"], source: "Shifty" },
  { name: "Slayer Energy Drink", effect: "Adds 10 Magic Find to Critical Potions.", affectedPotions: ["CRITICAL"], source: "Shifty" },
  { name: "Black Coffee", effect: "Adds 12 Speed to potions with Speed.", affectedPotions: ["SPEED","RABBIT","AGILITY"], source: "Ezekiel / Grog" },
  { name: "Scarleton Premium", effect: "Increases the effect of Wounded Potions by 10%.", affectedPotions: ["WOUNDED"], source: "Ezekiel" },
] as const;

export const potionAffinity = [
  { id: "POTION_AFFINITY_TALISMAN", name: "Potion Affinity Talisman", durationBonusPercent: 10, collectionTier: 3 },
  { id: "RING_POTION_AFFINITY", name: "Potion Affinity Ring", durationBonusPercent: 25, collectionTier: 7 },
  { id: "ARTIFACT_POTION_AFFINITY", name: "Potion Affinity Artifact", durationBonusPercent: 50, collectionTier: 9 },
] as const;

export function compatibleBrews(potionId: string) { return brews.filter(brew => brew.affectedPotions.includes(potionId.toUpperCase())); }
