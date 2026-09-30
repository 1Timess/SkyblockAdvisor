import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import type { NeuRepository } from "../reference/neu/repository";
import xpTables from "../reference/xp-tables.json";
import { buildRuneCatalog, RUNECRAFTING_CAP, runecraftingMechanics, runecraftingRankMechanics } from "./reference";

const XP_TO_25 = xpTables.runecrafting.slice(0, RUNECRAFTING_CAP).reduce((sum, value) => sum + value, 0);

export function buildRunecraftingAdvisorContext(profile: NormalizedSkyBlockProfile, neu?: NeuRepository): AdvisorDomainContext {
  const skill = profile.progression.skills.runecrafting;
  const level = skill?.level ?? null;
  const xp = skill?.xp ?? null;
  const xpToNext = skill?.xpForNext === null || skill?.xpForNext === undefined ? null : Math.max(0, skill.xpForNext - skill.xpCurrent);
  const xpTo25 = xp === null ? null : Math.max(0, XP_TO_25 - xp);
  const runes = buildRuneCatalog(neu);
  const complete = runes.filter(rune => rune.tier !== null && rune.runecraftingLevelRequired !== null && rune.applicableTo !== null).length;
  const actions = level === null
    ? [{ kind: "INVESTIGATE" as const, priority: 1, title: "Resolve Runecrafting progress", reason: "Runecrafting XP is not reported." }]
    : level >= RUNECRAFTING_CAP
      ? [{ kind: "HOLD" as const, priority: 1, title: "Runecrafting skill cap reached", reason: "The observed Runecrafting level is already 25." }]
      : [{ kind: "LEVEL_RUNECRAFTING" as const, priority: 1, title: "Level Runecrafting for cosmetic rune access",
          reason: "Runecrafting progression unlocks cosmetic rune access. Account rank is not normalized, so the effective cap and XP multiplier cannot be asserted." }];

  return {
    domain: "RUNECRAFTING",
    skill: { level, xp, nominalCap: RUNECRAFTING_CAP, xpToNext, xpTo25 },
    accountMechanics: {
      observedRank: null,
      effectiveCap: null,
      xpMultiplier: null,
      defaultRankCap: 3,
      ranks: runecraftingRankMechanics,
      note: "Rank is not present in the normalized profile. Do not infer rank from observed Runecrafting XP or level.",
    },
    mechanics: runecraftingMechanics,
    runeCatalog: {
      source: neu ? "NEU" : "UNAVAILABLE",
      total: runes.length,
      complete,
      partial: runes.length - complete,
      runes: runes.slice(0, 256),
    },
    progressionFocus: { actions },
    unavailableFacts: [
      "Account rank is not normalized, so effective Runecrafting cap and rank XP multiplier are unresolved.",
      ...(neu ? [] : ["NEU rune reference data was not loaded."]),
      ...(runes.length && complete < runes.length ? ["Some NEU rune entries do not expose every parsed field; missing requirement/application facts remain UNKNOWN."] : []),
    ],
    note: "Runecrafting is cosmetic-only. Rune tier is not treated as the Runecrafting level requirement.",
  };
}
