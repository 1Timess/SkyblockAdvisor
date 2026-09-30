import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import type { MarketQuote } from "../../schemas/market";
import xpTables from "../reference/xp-tables.json";
import { alchemyDurationBonusPercent, brewablePotions, brewingMechanics, godPotionDurationHours, potionFocusForQuestion, potionUnlockStatus } from "./reference";
import { buildAlchemyWisdomState } from "./wisdom";
import { alchemyLevelingMethods, effectiveAlchemyXp } from "./leveling";
import { recipesForPotion } from "./recipes";
import { compatibleBrews, potionAffinity } from "./modifiers";
import { godPotionMixins, mixinRequirementStatus } from "./mixins";

const ALCHEMY_CAP = 50;
const ALCHEMY_XP_TO_50 = xpTables.skill.slice(0, ALCHEMY_CAP).reduce((sum, value) => sum + value, 0);

export function buildAlchemyAdvisorContext(profile: NormalizedSkyBlockProfile, question: string, quotes: ReadonlyMap<string, MarketQuote> = new Map()): AdvisorDomainContext {
  const skill = profile.progression.skills.alchemy;
  const xp = skill?.xp ?? null;
  const level = skill?.level ?? null;
  const xpTo50 = xp === null ? null : Math.max(0, ALCHEMY_XP_TO_50 - xp);
  const focus = potionFocusForQuestion(question);
  const wisdom = buildAlchemyWisdomState(profile);
  const observedAffinity = [...potionAffinity].reverse().find(tier =>
    profile.accessories.owned.some(item => item.active && (item.id === tier.id || item.name.toLowerCase() === tier.name.toLowerCase()))) ?? null;
  const levelingMethods = alchemyLevelingMethods.map(method => {
    const effectiveXpPerBatchFloor = effectiveAlchemyXp(method.xpPerBatch, wisdom.confirmedWisdom);
    const ingredientPriceCoins = quotes.get(method.marketKey)?.coins ?? null;
    return { ...method, effectiveXpPerBatchFloor, ingredientPriceCoins,
      grossCoinsPerXpFloor: ingredientPriceCoins === null ? null : ingredientPriceCoins / effectiveXpPerBatchFloor,
      batchesTo50Floor: xpTo50 === null ? null : Math.ceil(xpTo50 / effectiveXpPerBatchFloor) };
  });
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
        skillXpBoostRules: [...brewingMechanics.skillXpBoostRules],
        ordinaryPotionParrotDurationBonusMaxPercent: brewingMechanics.ordinaryPotionParrotDurationBonusMaxPercent,
      },
    },
    godPotion: {
      durationHours: godPotionDurationHours(level),
      potionAffinityApplies: brewingMechanics.godPotion.potionAffinityApplies,
      parrotDurationBonusMaxPercent: brewingMechanics.godPotion.parrotDurationBonusMaxPercent,
      maxStackedDurationHours: brewingMechanics.godPotion.maxStackedDurationHours,
      mixinCount: brewingMechanics.godPotion.mixinCount,
      effects: brewingMechanics.godPotion.effects.map(([name, effectLevel]) => ({ name, level: effectLevel })),
      mixins: godPotionMixins.map(mixin => ({ ...mixin, requirement: mixin.requirement ? { ...mixin.requirement } : null, requirementStatus: mixinRequirementStatus(profile, mixin) })),
    },
    wisdom,
    levelingMethods,
    potionCatalog: {
      brewableCount: brewablePotions.length,
      recipeCoverage: "PARTIAL_VERIFIED",
      focus: focus.slice(0, 12).map(entry => ({
        id: entry.id, name: entry.name, effect: entry.effect, maxLevel: entry.maxLevel,
        tags: [...entry.tags], unlock: entry.unlock, unlockStatus: potionUnlockStatus(profile.unlockedCollectionTiers, entry),
        recipeStatus: recipesForPotion(entry.id).length ? "VERIFIED" as const : entry.recipeStatus,
        recipes: recipesForPotion(entry.id).map(recipe => ({
          basePotion: recipe.basePotion, ingredientName: recipe.ingredientName, ingredientId: recipe.ingredientId,
          resultingLevel: recipe.resultingLevel, alchemyXpPerPotion: recipe.alchemyXpPerPotion, evidence: recipe.evidence,
        })),
        compatibleBrews: compatibleBrews(entry.id).map(({ name, effect, source }) => ({ name, effect, source })),
      })),
    },
    potionAffinity: {
      observed: observedAffinity ? { name: observedAffinity.name, durationBonusPercent: observedAffinity.durationBonusPercent } : null,
      appliesToConsumedPotions: true, appliesToSplashPotions: false, appliesToGodPotion: false,
      tiers: potionAffinity.map(tier => ({ ...tier })),
    },
    unavailableFacts: [
      "Recipe coverage is partial: verified high-value progression, mining, combat, archery, and pet-luck ingredient paths are encoded; other potion recipes remain unresolved rather than inferred.",
      "Effective Alchemy Wisdom is a lower bound: Booster Cookie, active potion effects, temporary consumables, event multipliers, and some other sources are not normalized.",
      "Active God Potion, Cookie Buff, and applied/consumed Mixin timers are not reconstructed; Mixin eligibility is derived only from observable requirements.",
    ],
    note: "Alchemy context separates skill progression, brewing mechanics, potion selection, XP methods, observed Wisdom, Witch throughput, and God Potion duration. Unresolved recipe and multiplier facts remain explicit rather than inferred.",
  };
}
