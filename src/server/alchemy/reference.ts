export type AlchemyActivityTag = "ALCHEMY" | "COMBAT" | "ARCHERY" | "MINING" | "PETS" | "ENCHANTING" | "SURVIVABILITY" | "UTILITY";

export interface PotionReference {
  id: string;
  name: string;
  brewable: boolean;
  unlock: { collection: string; tier: number } | null;
  maxLevel: number;
  effect: string;
  tags: AlchemyActivityTag[];
  recipeStatus: "UNRESOLVED";
}

const potion = (id: string, name: string, maxLevel: number, effect: string, tags: AlchemyActivityTag[],
  unlock: PotionReference["unlock"] = null): PotionReference =>
  ({ id, name, brewable: true, unlock, maxLevel, effect, tags, recipeStatus: "UNRESOLVED" });

export const brewablePotions: readonly PotionReference[] = [
  potion("ABSORPTION", "Absorption", 8, "Grants Absorption health.", ["SURVIVABILITY"], { collection: "GOLD_INGOT", tier: 6 }),
  potion("ADRENALINE", "Adrenaline", 8, "Grants Absorption health and Speed.", ["SURVIVABILITY", "UTILITY"], { collection: "INK_SACK:3", tier: 7 }),
  potion("AGILITY", "Agility", 4, "Grants Speed and a chance for mob attacks to miss.", ["COMBAT", "SURVIVABILITY", "UTILITY"], { collection: "RAW_CHICKEN", tier: 8 }),
  potion("ARCHERY", "Archery", 4, "Increases bow damage.", ["COMBAT", "ARCHERY"], { collection: "FEATHER", tier: 3 }),
  potion("BLINDNESS", "Blindness", 3, "Grants Blindness.", ["COMBAT"], { collection: "INK_SACK", tier: 6 }),
  potion("BURNING", "Burning", 4, "Damaging enemies sets them on fire.", ["COMBAT"], { collection: "SAND", tier: 6 }),
  potion("COLD_RESISTANCE", "Cold Resistance", 4, "Grants Cold Resistance.", ["MINING", "SURVIVABILITY"], { collection: "GLACITE", tier: 2 }),
  potion("CRITICAL", "Critical", 4, "Grants Crit Chance and Crit Damage.", ["COMBAT", "ARCHERY"], { collection: "GRAVEL", tier: 7 }),
  potion("DAMAGE", "Damage", 8, "Instantly deals damage.", ["COMBAT"]),
  potion("DODGE", "Dodge", 4, "Gives mob attacks a chance to miss.", ["COMBAT", "SURVIVABILITY"], { collection: "RAW_FISH:1", tier: 2 }),
  potion("EXPERIENCE", "Experience", 4, "Increases experience orb gain.", ["ENCHANTING", "UTILITY"], { collection: "INK_SACK:4", tier: 6 }),
  potion("FIRE_RESISTANCE", "Fire Resistance", 1, "Grants immunity to fire and lava.", ["SURVIVABILITY", "UTILITY"]),
  potion("HASTE", "Haste", 4, "Increases Mining Speed.", ["MINING"], { collection: "COAL", tier: 3 }),
  potion("HEALING", "Healing", 9, "Grants an instant Health boost.", ["SURVIVABILITY"]),
  potion("INVISIBILITY", "Invisibility", 1, "Makes the affected entity invisible.", ["UTILITY"]),
  potion("JUMP_BOOST", "Jump Boost", 4, "Increases jump height.", ["UTILITY"]),
  potion("KNOCKBACK", "Knockback", 4, "Increases knockback dealt when damaging enemies.", ["COMBAT"], { collection: "SLIME_BALL", tier: 4 }),
  potion("MANA", "Mana", 8, "Grants Mana regeneration.", ["COMBAT", "UTILITY"], { collection: "MUTTON", tier: 4 }),
  potion("NIGHT_VISION", "Night Vision", 2, "Grants greater visibility at night.", ["UTILITY"]),
  potion("PET_LUCK", "Pet Luck", 4, "Grants Pet Luck.", ["PETS"], { collection: "RABBIT", tier: 8 }),
  potion("POISON", "Poison", 4, "Deals damage over time.", ["COMBAT"]),
  potion("RABBIT", "Rabbit", 6, "Grants Jump Boost and Speed.", ["UTILITY"], { collection: "RABBIT", tier: 3 }),
  potion("REGENERATION", "Regeneration", 9, "Grants Health regeneration.", ["SURVIVABILITY"]),
  potion("RESISTANCE", "Resistance", 8, "Grants Defense.", ["SURVIVABILITY"], { collection: "CACTUS", tier: 3 }),
  potion("SLOWNESS", "Slowness", 8, "Reduces Speed.", ["COMBAT"]),
  potion("SPEED", "Speed", 8, "Grants Speed.", ["UTILITY"]),
  potion("SPELUNKER", "Spelunker", 5, "Grants Mining Fortune.", ["MINING"], { collection: "MITHRIL_ORE", tier: 2 }),
  potion("STAMINA", "Stamina", 4, "Instantly restores Health and Mana.", ["SURVIVABILITY", "UTILITY"]),
  potion("STRENGTH", "Strength", 8, "Grants Strength.", ["COMBAT"],),
  potion("STUN", "Stun", 4, "Gives hits a chance to stun; splash potions stun affected enemies.", ["COMBAT"], { collection: "OBSIDIAN", tier: 6 }),
  potion("TRUE_RESISTANCE", "True Resistance", 4, "Grants True Defense.", ["SURVIVABILITY"]),
  potion("VENOMOUS", "Venomous", 4, "Reduces Speed and deals damage over time.", ["COMBAT"], { collection: "POTATO_ITEM", tier: 5 }),
  potion("WATER_BREATHING", "Water Breathing", 6, "Grants a chance to avoid drowning damage.", ["UTILITY"]),
  potion("WEAKNESS", "Weakness", 8, "Reduces Damage dealt.", ["COMBAT"]),
  potion("WOUNDED", "Wounded", 4, "Reduces healing.", ["COMBAT"], { collection: "NETHERRACK", tier: 2 }),
] as const;

export const brewingMechanics = {
  standOperationSeconds: 20,
  potionSlotsPerBatch: 3,
  alchemyLevelDurationPercentPerLevel: 1,
  modifiers: {
    level: [
      { item: "Glowstone Dust", levelIncrease: 1 },
      { item: "Enchanted Glowstone Dust", levelIncrease: 2 },
      { item: "Enchanted Glowstone", levelIncrease: 3 },
    ],
    duration: [
      { item: "Redstone Dust", baseDurationMinutes: 8 },
      { item: "Enchanted Redstone Dust", baseDurationMinutes: 16 },
      { item: "Enchanted Redstone Block", baseDurationMinutes: 40 },
    ],
    splash: [
      { item: "Gunpowder", durationMultiplier: 0.5 },
      { item: "Enchanted Gunpowder", durationMultiplier: 1 },
    ],
    combined: { item: "Enchanted Redstone Lamp", levelIncrease: 3, baseDurationMinutes: 16 },
  },
  skillXpBoostRules: [
    "Skill XP Boost Potions are sourced from Gifts rather than brewed from a normal potion ingredient.",
    "Redstone Dust and Enchanted Redstone Dust do not affect Skill XP Boost Potions.",
    "Glowstone can raise an unmodified Skill XP Boost Potion by 1 level up to III without changing duration.",
    "Enchanted Glowstone can raise an unmodified Skill XP Boost Potion by 2 levels up to III without changing duration.",
    "Enchanted Redstone Lamp sets an unmodified Skill XP Boost Potion to level III and 36 minutes before the brewer Alchemy duration bonus.",
    "Applying modifiers requires at least one unmodified non-XP-Boost potion in the Brewing Stand alongside 1-3 Skill XP Boost Potions.",
  ],
  ordinaryPotionParrotDurationBonusMaxPercent: 40,
  orderingRules: [
    "Enchanted Gunpowder must be applied after a duration modifier to preserve its no-duration-loss effect.",
    "When combining Enchanted Redstone Block with Enchanted Redstone Lamp for level increase, apply the block first.",
  ],
  godPotion: {
    baseDurationHours: 12,
    durationHoursPerAlchemyLevel: 0.24,
    potionAffinityApplies: false,
    parrotDurationBonusMaxPercent: 20,
    maxStackedDurationHours: 192,
    effects: [
      ["Critical",4],["Regeneration",9],["Strength",8],["Agility",4],["Night Vision",1],["Absorption",8],
      ["Burning",4],["Stun",4],["Dodge",4],["Experience",4],["Mana",8],["Speed",8],["Water Breathing",6],
      ["Alchemy XP Boost",3],["Combat XP Boost",3],["Enchanting XP Boost",3],["Farming XP Boost",3],
      ["Fishing XP Boost",3],["Foraging XP Boost",3],["Mining XP Boost",3],["Rabbit",6],["Resistance",8],
      ["Archery",4],["Jump Boost",4],["Magic Find",4],["Pet Luck",4],["Spirit",4],["Spelunker",5],
      ["Adrenaline",8],["Fire Resistance",1],["Haste",4],["True Resistance",4],
    ] as readonly (readonly [string, number])[],
    mixinCount: 13,
  },
} as const;

export function alchemyDurationBonusPercent(level: number | null): number | null {
  return level === null ? null : Math.max(0, Math.min(50, level));
}

export function godPotionDurationHours(level: number | null, parrotBonusPercent = 0): number | null {
  if (level === null) return null;
  const base = brewingMechanics.godPotion.baseDurationHours + brewingMechanics.godPotion.durationHoursPerAlchemyLevel * Math.max(0, Math.min(50, level));
  return base * (1 + Math.max(0, parrotBonusPercent) / 100);
}

export function potionFocusForQuestion(question: string): PotionReference[] {
  const text = question.toLowerCase();
  const named = brewablePotions.filter(entry => text.includes(entry.name.toLowerCase()));
  if (named.length) return named;
  const tags: AlchemyActivityTag[] = [];
  if (/\bmin(?:e|ing|er)\b|\bhotm\b|\bglacite\b/.test(text)) tags.push("MINING");
  if (/\barcher\b|\barchery\b|\bbow\b|\bshortbow\b/.test(text)) tags.push("ARCHERY");
  if (/\bpet(?:s)?\b|\bpet luck\b/.test(text)) tags.push("PETS");
  if (/\benchant(?:ing)?\b|\bexperience orbs?\b/.test(text)) tags.push("ENCHANTING");
  if (/\bsurviv|\bdefen[cs]e\b|\bhealth\b|\btank/.test(text)) tags.push("SURVIVABILITY");
  if (/\bcombat\b|\bdamage\b|\bdps\b|\bstrength\b|\bcrit/.test(text)) tags.push("COMBAT");
  if (/\bspeed\b|\bmovement\b|\bjump\b|\butility\b/.test(text)) tags.push("UTILITY");
  if (!tags.length) return [];
  return brewablePotions.filter(entry => tags.some(tag => entry.tags.includes(tag)));
}


export function potionUnlockStatus(profileUnlockedTiers: readonly string[], potion: PotionReference): "AVAILABLE" | "LOCKED" | "NO_COLLECTION_GATE" | "UNKNOWN" {
  if (!potion.unlock) return "NO_COLLECTION_GATE";
  const prefix = potion.unlock.collection.toUpperCase();
  const observed = profileUnlockedTiers.filter(value => value.toUpperCase().startsWith(prefix + "_"))
    .map(value => Number(value.slice(prefix.length + 1))).filter(Number.isFinite);
  if (!observed.length) return "UNKNOWN";
  return Math.max(...observed) >= potion.unlock.tier ? "AVAILABLE" : "LOCKED";
}
