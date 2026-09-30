import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import xpTables from "../reference/xp-tables.json";
import { alchemyDurationBonusPercent, brewablePotions, brewingMechanics, godPotionDurationHours, potionFocusForQuestion } from "./reference";

const ALCHEMY_CAP = 50;
const ALCHEMY_XP_TO_50 = xpTables.skill.slice(0, ALCHEMY_CAP).reduce((sum, value) => sum + value, 0);

export function buildAlchemyAdvisorContext(profile: NormalizedSkyBlockProfile, question: string): AdvisorDomainContext {
  const skill = profile.progression.skills.alchemy;
  const xp = skill?.xp ?? null;
  const level = skill?.level ?? null;
  const xpTo50 = xp === null ? null : Math.max(0, ALCHEMY_XP_TO_50 - xp);
  const focus = potionFocusForQuestion(question);
  return {
    domain: "ALCHEMY",
    skill: {
      level,
      xp,
      cap: ALCHEMY_CAP,
      xpToNext: skill?.xpForNext === null || skill?.xpForNext === undefined ? null : Math.max(0, skill.xpForNext - skill.xpCurrent),
      xpTo50,
      potionDurationBonusPercent: alchemyDurationBonusPercent(level),
    },
    brewing: {
      standOperationSeconds: brewingMechanics.standOperationSeconds,
      potionSlotsPerBatch: brewingMechanics.potionSlotsPerBatch,
      modifierRules: {
        level: brewingMechanics.modifiers.level.map(value => ({ ...value })),
        duration: brewingMechanics.modifiers.duration.map(value => ({ ...value })),
        splash: brewingMechanics.modifiers.splash.map(value => ({ ...value })),
        combined: { ...brewingMechanics.modifiers.combined },
        orderingRules: [...brewingMechanics.orderingRules],
      },
    },
    godPotion: {
      durationHours: godPotionDurationHours(level),
      potionAffinityApplies: brewingMechanics.godPotion.potionAffinityApplies,
      parrotDurationBonusMaxPercent: brewingMechanics.godPotion.parrotDurationBonusMaxPercent,
    },
    potionCatalog: {
      brewableCount: brewablePotions.length,
      recipeCoverage: "UNRESOLVED",
      focus: focus.slice(0, 12).map(entry => ({
        id: entry.id, name: entry.name, effect: entry.effect, maxLevel: entry.maxLevel,
        tags: [...entry.tags], unlock: entry.unlock, recipeStatus: entry.recipeStatus,
      })),
    },
    unavailableFacts: [
      "Exact potion ingredient sequences and ingredient-to-Alchemy-XP mappings are not yet encoded in this implementation slice.",
      "Effective Alchemy Wisdom is not reconstructed until Booster Cookie, potion-effect, pet, accessory, Slayer, and event modifier observability are joined.",
      "Potion Affinity ownership/effective tier and active God Potion/Mixin state are not yet reconstructed.",
    ],
    note: "Alchemy context separates skill progression, brewing mechanics, potion selection, and God Potion duration. Unresolved recipe and multiplier facts remain explicit rather than inferred.",
  };
}
