import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import xpTables from "../reference/xp-tables.json";
import { CARPENTRY_CAP, carpentryMechanics } from "./reference";
import { carpentryLevelingMethods, collectionRequirementStatus } from "./leveling";

const XP_TO_50 = xpTables.skill.slice(0, CARPENTRY_CAP).reduce((sum, value) => sum + value, 0);

export function carpentryXpFromIngredientNpcValue(ingredientNpcSellValue: number) {
  return ingredientNpcSellValue * carpentryMechanics.xp.ingredientNpcSellValueRate;
}

export function buildCarpentryAdvisorContext(profile: NormalizedSkyBlockProfile, quotes: ReadonlyMap<string, MarketQuote> = new Map(), budgetCoins: number | null = null): AdvisorDomainContext {
  const skill = profile.progression.skills.carpentry;
  const level = skill?.level ?? null;
  const xp = skill?.xp ?? null;
  const xpToNext = skill?.xpForNext === null || skill?.xpForNext === undefined ? null : Math.max(0, skill.xpForNext - skill.xpCurrent);
  const xpTo50 = xp === null ? null : Math.max(0, XP_TO_50 - xp);
  const quickCraftingStatus = level === null ? "UNKNOWN" as const : level >= carpentryMechanics.quickCrafting.carpentryLevel ? "LEVEL_MET" as const : "LEVEL_LOCKED" as const;

  const levelingMethods = carpentryLevelingMethods.map(method => {
    const ingredientNpcSellValue = method.inputNpcSellValueEach * method.inputCount;
    const carpentryXpPerCraft = carpentryXpFromIngredientNpcValue(ingredientNpcSellValue);
    const inputQuote = quotes.get(method.inputMarketKey);
    const outputQuote = quotes.get(method.outputMarketKey);
    const acquisitionCostCoins = inputQuote ? inputQuote.coins * method.inputCount : null;
    const bazaarRecoveryValueCoins = outputQuote?.coins ?? null;
    const bestObservedRecoveryValueCoins = Math.max(method.outputNpcSellValue, bazaarRecoveryValueCoins ?? 0);
    const effectiveCostCoins = acquisitionCostCoins === null ? null : acquisitionCostCoins - bestObservedRecoveryValueCoins;
    const effectiveCoinsPerXp = effectiveCostCoins === null ? null : effectiveCostCoins / carpentryXpPerCraft;
    const craftsTo50 = xpTo50 === null ? null : Math.ceil(xpTo50 / carpentryXpPerCraft);
    const estimatedEffectiveCostTo50 = craftsTo50 === null || effectiveCostCoins === null ? null : craftsTo50 * effectiveCostCoins;
    const budgetStatus = budgetCoins === null ? "NO_BUDGET" as const
      : estimatedEffectiveCostTo50 === null ? "UNKNOWN" as const
      : Math.max(0, estimatedEffectiveCostTo50) <= budgetCoins ? "WITHIN_BUDGET" as const : "OVER_BUDGET" as const;
    return {
      id: method.id, name: method.name, inputName: method.inputName, inputCount: method.inputCount,
      carpentryXpPerCraft, ingredientNpcSellValue, acquisitionCostCoins, bazaarRecoveryValueCoins,
      npcRecoveryValueCoins: method.outputNpcSellValue, bestObservedRecoveryValueCoins, effectiveCostCoins, effectiveCoinsPerXp,
      craftsTo50, estimatedEffectiveCostTo50, budgetStatus,
      requirementStatus: collectionRequirementStatus(profile, method.collectionPrefix, method.collectionTier),
      collectionRequirement: { prefix: method.collectionPrefix, tier: method.collectionTier },
    };
  });
  const ranked = levelingMethods.filter(method => method.requirementStatus !== "LOCKED" && method.effectiveCoinsPerXp !== null)
    .sort((a, b) => (a.effectiveCoinsPerXp ?? Number.POSITIVE_INFINITY) - (b.effectiveCoinsPerXp ?? Number.POSITIVE_INFINITY));
  const best = ranked[0] ?? null;

  const progressionActions = level === null
    ? [{ kind: "INVESTIGATE" as const, priority: 1, title: "Resolve Carpentry skill progress",
        reason: "Carpentry XP is not reported, so level-target recommendations cannot be personalized safely." }]
    : level >= CARPENTRY_CAP
      ? [{ kind: "HOLD" as const, priority: 1, title: "Carpentry skill cap reached", reason: "The observed Carpentry level is already 50." }]
      : best
        ? [{ kind: "LEVEL_CARPENTRY" as const, priority: 1, title: `Level Carpentry with ${best.name}`,
            reason: `Lowest observed effective coins/XP among the supported, non-locked methods: ${best.effectiveCoinsPerXp!.toFixed(3)}. Recovery uses the better of the live output quote and verified NPC sell floor.` }]
        : [{ kind: "LEVEL_CARPENTRY" as const, priority: 1, title: "Level Carpentry with an eligible 3x3 craft",
            reason: "Current market evidence is insufficient to rank the supported methods; do not infer a globally best craft." }];

  return {
    domain: "CARPENTRY",
    skill: { level, xp, cap: CARPENTRY_CAP, xpToNext, xpTo50 },
    mechanics: {
      unlockRequirement: carpentryMechanics.unlock.requirement,
      carpentryTableUnlockedByQuest: carpentryMechanics.unlock.carpentryTableUnlocked,
      xpRateFromIngredientNpcSellValue: carpentryMechanics.xp.ingredientNpcSellValueRate,
      xpFormula: carpentryMechanics.xp.formula,
      requiresThreeByThreeCrafting: carpentryMechanics.xp.requiresThreeByThreeCrafting,
      inventoryTwoByTwoAwardsXp: carpentryMechanics.xp.inventoryTwoByTwoAwardsXp,
      mostVanillaRecipesAwardXp: carpentryMechanics.xp.mostVanillaRecipesAwardXp,
      healthPerLevel: carpentryMechanics.rewards.healthPerLevel,
    },
    quickCrafting: {
      carpentryLevelRequired: carpentryMechanics.quickCrafting.carpentryLevel, levelStatus: quickCraftingStatus,
      accountAvailabilityStatus: "UNREPORTED", note: carpentryMechanics.quickCrafting.note,
    },
    furniture: { finalRecipeUnlockLevel: carpentryMechanics.furniture.finalUnlockLevel, note: carpentryMechanics.furniture.note },
    progressionFocus: { actions: progressionActions,
      note: "Method ranking is bounded to the verified Carpentry leveling set. It does not claim global optimality; NEU recipe normalization can later broaden this into a general recipe graph." },
    levelingMethods,
    unavailableFacts: [
      "Carpentry quest completion / Carpentry Table ownership is not normalized.",
      "Quick Crafting account/rank availability is not normalized.",
      "Carpentry Wisdom and temporary skill-XP multipliers are not normalized, so XP values are base XP rather than boosted session XP.",
      "Leveling-method coverage is intentionally partial. NEU recipe/recipes fields are preserved by ingestion but are not yet normalized into the reusable recipe graph needed for exhaustive normal/Ironman pathway analysis.",
    ],
    note: "Carpentry context reports observed skill progress, deterministic base XP mechanics, and live economics for a bounded verified method set without hardcoding a stale global winner.",
  };
}
