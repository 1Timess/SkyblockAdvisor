import { experimentationMechanicsSchema, skillMilestoneSchema, type SkillMilestone } from "../../schemas/enchanting-mechanics";
import { levelFromXp } from "./leveling";
import xpTables from "./xp-tables.json";

export const ENCHANTING_CAP = 60;
export const enchantingLevelFromXp = (xp: number) => levelFromXp(xp, xpTables.skill, ENCHANTING_CAP);

// Rewards Per Level: https://hypixelskyblock.minecraft.wiki/w/Enchanting
// User confirmed this table as current on 2026-09-27. Routine stat/coin/XP grants
// are level rewards, not individual actionable unlock milestones.
const enchantUnlocks: Readonly<Record<number, readonly string[]>> = {
  1: ["Scavenger"], 2: ["Infinite Quiver", "Harvesting"], 3: ["Luck", "Cubism"],
  4: ["Cleave", "Angler"], 5: ["Life Steal", "Scuba", "Feast", "Woodsplitter", "Growth"],
  6: ["Snipe", "Rainbow"], 7: ["Replenish", "Sugar Rush"],
  8: ["Giant Killer", "Piscary", "Dragon Tracer"], 9: ["Blessing", "Critical"],
  10: ["Pesterminator", "First Strike", "Rejuvenate"], 11: ["Ender Slayer", "Chance"],
  12: ["Dedication", "Impaling", "Forest Pledge"], 13: ["Tidal", "Magnet"],
  14: ["Lethality", "Frail", "Execute", "Missile", "Thunderlord", "First Impression"],
  15: ["Drain", "Caster", "Flowstate", "True Protection", "Vampirism"],
  16: ["Gravity", "Bank"], 17: ["Piercing", "Venomous"],
  18: ["Spiked Hook", "Ultimate Jerry"], 19: ["Triple-Strike"],
  20: ["Refrigerate", "Thunderbolt", "Mana Steal", "Ultimate Wise"],
  21: ["Big Brain", "Smarty Pants", "Small Brain"],
  22: ["Mana Vampire", "Hardened Mana", "Prismatic", "Counter-Strike", "Ferocious Mana", "Strong Mana", "Lapidary"],
  23: ["Quick Bite", "Respite", "Smoldering"],
  24: ["Bobbin' Time", "Reflection", "Green Thumb", "Combo"],
  25: ["Corruption", "Charm", "The One", "Prosecute"], 26: ["Vicious"],
  27: ["Paleontologist", "Sunset", "Wisdom"],
  28: ["Habanero Tactics", "Titan Killer", "Duplex"], 29: ["No Pain No Gain"],
  30: ["Ice Cold", "Flash", "Last Stand"], 31: ["Chimera"],
  32: ["Rend", "Crop Fever"], 33: ["Overload"], 34: ["Legion"],
  35: ["Swarm"], 36: ["Soul Eater"], 37: ["Fatal Tempo", "Inferno"],
  38: ["One For All"],
};

export const enchantingMilestones: readonly SkillMilestone[] = Object.freeze(
  Object.entries(enchantUnlocks).flatMap(([level, names]) => names.map(name =>
    skillMilestoneSchema.parse({ skill: "enchanting", level: Number(level), kind: "ENCHANT_ACCESS", name, source: "USER_CONFIRMED_WIKI_REWARDS" })
  )).concat([skillMilestoneSchema.parse({
    skill: "enchanting", level: 10, kind: "ACTIVITY_ACCESS", name: "Experimentation Table",
    source: "USER_CONFIRMED_WIKI_REWARDS",
  })]).sort((a, b) => a.level - b.level || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
);

export function upcomingEnchantingMilestones(level: number): readonly SkillMilestone[] {
  return enchantingMilestones.filter(milestone => milestone.level > level);
}

const unknown = { status: "UNKNOWN" as const, value: null, source: null };
export const experimentationMechanics = experimentationMechanicsSchema.parse({
  accessLevel: 10,
  tiers: unknown,
  dailyCharges: unknown,
  resets: unknown,
  rngMeter: unknown,
});
