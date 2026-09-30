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

export function buildAlchemyAdvisorContext(profile: NormalizedSkyBlockProfile, question: string, quotes: ReadonlyMap<string, MarketQuote> = new Map(), budgetCoins: number | null = null): AdvisorDomainContext {
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
    const batchesTo50Floor = xpTo50 === null ? null : Math.ceil(xpTo50 / effectiveXpPerBatchFloor);
    const estimatedIngredientCostTo50Floor = ingredientPriceCoins === null || batchesTo50Floor === null ? null : ingredientPriceCoins * batchesTo50Floor;
    const budgetStatus = budgetCoins === null ? "NO_BUDGET" as const
      : estimatedIngredientCostTo50Floor === null ? "UNKNOWN" as const
      : estimatedIngredientCostTo50Floor <= budgetCoins ? "WITHIN_BUDGET" as const : "OVER_BUDGET" as const;
    return { ...method, effectiveXpPerBatchFloor, ingredientPriceCoins,
      grossCoinsPerXpFloor: ingredientPriceCoins === null ? null : ingredientPriceCoins / effectiveXpPerBatchFloor,
      batchesTo50Floor, estimatedIngredientCostTo50Floor, budgetStatus };
  });
  const rankedLevelingMethods = [...levelingMethods]
    .filter(method => method.grossCoinsPerXpFloor !== null)
    .sort((a, b) => (a.grossCoinsPerXpFloor ?? Number.POSITIVE_INFINITY) - (b.grossCoinsPerXpFloor ?? Number.POSITIVE_INFINITY));
  const bestLevelingMethod = rankedLevelingMethods[0] ?? null;
  const netherWartTiers = profile.unlockedCollectionTiers.filter(value => value.toUpperCase().startsWith("NETHER_WART_"))
    .map(value => Number(value.slice("NETHER_WART_".length))).filter(Number.isFinite);
  const netherWartTier = netherWartTiers.length ? Math.max(...netherWartTiers) : null;
  const affinityRank = observedAffinity ? potionAffinity.findIndex(tier => tier.id === observedAffinity.id) : -1;
  const nextAffinity = potionAffinity[affinityRank + 1] ?? null;
  const nextAffinityStatus = nextAffinity === null ? "MAXED" as const
    : netherWartTier === null ? "UNKNOWN" as const
    : netherWartTier >= nextAffinity.collectionTier ? "AVAILABLE" as const : "LOCKED" as const;
  const progressionActions = [
    ...(level === null ? [{
      kind: "INVESTIGATE" as const, priority: 1, title: "Resolve Alchemy skill progress",
      reason: "Alchemy XP is not reported, so level-target economics cannot be personalized safely.",
      evidence: ["Missing normalized Alchemy XP is preserved as UNKNOWN rather than treated as zero."],
    }] : level < ALCHEMY_CAP && bestLevelingMethod ? [{
      kind: "LEVELING_METHOD" as const, priority: 1,
      title: `Level Alchemy with ${bestLevelingMethod.potion} ${bestLevelingMethod.resultingLevel}`,
      reason: `Lowest observed gross coins/XP among the encoded leveling methods: ${bestLevelingMethod.grossCoinsPerXpFloor!.toFixed(3)}.`,
      evidence: [
        `${bestLevelingMethod.ingredientName}: ${bestLevelingMethod.xpPerBatch.toLocaleString()} base Alchemy XP per 3-potion batch.`,
        bestLevelingMethod.ingredientPriceCoins === null ? "Current ingredient price is unavailable." : `Observed ingredient price: ${bestLevelingMethod.ingredientPriceCoins.toLocaleString()} coins.`,
        bestLevelingMethod.budgetStatus === "OVER_BUDGET"
          ? "The supplied budget does not cover the estimated ingredient cost all the way to Alchemy 50; this does not mean a partial leveling session is unaffordable."
          : `Level-50 budget status: ${bestLevelingMethod.budgetStatus}.`,
      ],
    }] : [{
      kind: "HOLD" as const, priority: 1, title: "Alchemy skill cap reached",
      reason: "The observed Alchemy level is already 50.", evidence: ["No further base Alchemy skill levels remain."],
    }]),
    ...(nextAffinity ? [{
      kind: "POTION_AFFINITY" as const, priority: 2, title: `Progress toward ${nextAffinity.name}`,
      reason: `Raises ordinary consumed-potion duration to +${nextAffinity.durationBonusPercent}% without incorrectly applying that bonus to splash potions or God Potions.`,
      evidence: [
        `Nether Wart collection requirement: tier ${nextAffinity.collectionTier}; observed collection tier: ${netherWartTier ?? "UNKNOWN"}.`,
        `Access status: ${nextAffinityStatus}.`,
      ],
    }] : []),
    ...(!wisdom.witch.owned && level !== null && level < ALCHEMY_CAP ? [{
      kind: "WITCH_PET" as const, priority: 3, title: "Evaluate a Witch Pet for Alchemy sessions",
      reason: "Witch is a verified Alchemy-specific throughput/Wisdom source, but acquisition cost and availability are not reconstructed here.",
      evidence: ["No owned Witch Pet is observed.", "Treat acquisition as an investigation until current cost/access evidence is available."],
    }] : []),
  ];
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
    progressionFocus: { actions: progressionActions, note: "Ordered deterministic Alchemy actions. Leveling-method priority uses only encoded XP plus current market evidence; it does not claim global optimality outside covered methods." },
    levelingMethods,
    potionCatalog: {
      brewableCount: brewablePotions.length,
      recipeCoverage: "PARTIAL_VERIFIED",
      focus: focus.slice(0, 12).map(entry => ({
        id: entry.id, name: entry.name, effect: entry.effect, maxLevel: entry.maxLevel,
        tags: [...entry.tags], unlock: entry.unlock, unlockStatus: potionUnlockStatus(profile.unlockedCollectionTiers, entry),
        recipeStatus: recipesForPotion(entry.id).length ? "VERIFIED" as const : entry.recipeStatus,
        recipes: recipesForPotion(entry.id).map(recipe => ({
          basePotion: recipe.basePotion, ...(recipe.basePotionId ? { basePotionId: recipe.basePotionId } : {}), ...(recipe.basePotionLevel ? { basePotionLevel: recipe.basePotionLevel } : {}), ingredientName: recipe.ingredientName, ingredientId: recipe.ingredientId,
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
