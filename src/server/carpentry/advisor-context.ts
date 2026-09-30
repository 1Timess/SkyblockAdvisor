import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import xpTables from "../reference/xp-tables.json";
import { CARPENTRY_CAP, carpentryMechanics } from "./reference";

const XP_TO_50 = xpTables.skill.slice(0, CARPENTRY_CAP).reduce((sum, value) => sum + value, 0);

export function carpentryXpFromIngredientNpcValue(ingredientNpcSellValue: number) {
  return ingredientNpcSellValue * carpentryMechanics.xp.ingredientNpcSellValueRate;
}

export function buildCarpentryAdvisorContext(profile: NormalizedSkyBlockProfile): AdvisorDomainContext {
  const skill = profile.progression.skills.carpentry;
  const level = skill?.level ?? null;
  const xp = skill?.xp ?? null;
  const xpToNext = skill?.xpForNext === null || skill?.xpForNext === undefined ? null : Math.max(0, skill.xpForNext - skill.xpCurrent);
  const xpTo50 = xp === null ? null : Math.max(0, XP_TO_50 - xp);
  const quickCraftingStatus = level === null ? "UNKNOWN" as const : level >= carpentryMechanics.quickCrafting.carpentryLevel ? "LEVEL_MET" as const : "LEVEL_LOCKED" as const;

  const progressionActions = level === null
    ? [{ kind: "INVESTIGATE" as const, priority: 1, title: "Resolve Carpentry skill progress",
        reason: "Carpentry XP is not reported, so level-target recommendations cannot be personalized safely." }]
    : level >= CARPENTRY_CAP
      ? [{ kind: "HOLD" as const, priority: 1, title: "Carpentry skill cap reached",
          reason: "The observed Carpentry level is already 50." }]
      : [{ kind: "LEVEL_CARPENTRY" as const, priority: 1, title: "Level Carpentry with an eligible 3x3 craft",
          reason: "Choose among verified eligible recipes using ingredient NPC value for XP and live acquisition/recovery prices for economics; no globally best craft is hardcoded." }];

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
      carpentryLevelRequired: carpentryMechanics.quickCrafting.carpentryLevel,
      levelStatus: quickCraftingStatus,
      accountAvailabilityStatus: "UNREPORTED",
      note: carpentryMechanics.quickCrafting.note,
    },
    furniture: {
      finalRecipeUnlockLevel: carpentryMechanics.furniture.finalUnlockLevel,
      note: carpentryMechanics.furniture.note,
    },
    progressionFocus: { actions: progressionActions,
      note: "Carpentry progression is intentionally bounded: recipe economics require verified recipe composition, ingredient NPC values, and live acquisition/recovery prices before ranking crafts." },
    levelingMethods: [],
    unavailableFacts: [
      "Carpentry quest completion / Carpentry Table ownership is not normalized.",
      "Quick Crafting account/rank availability is not normalized.",
      "No craft is ranked until verified recipe composition, NPC ingredient value, and live acquisition/recovery economics are joined.",
    ],
    note: "Carpentry context reports observed skill progress and deterministic XP mechanics without hardcoding a stale best craft.",
  };
}
