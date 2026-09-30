import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import xpTables from "../reference/xp-tables.json";
import { georgeCapRequirements, TAMING_BASE_CAP, TAMING_MAX_CAP, tamingLevelRewards, tamingMechanics, tamingServiceUnlocks, tamingXpMechanics } from "./reference";

const XP_TO_50 = xpTables.skill.slice(0, TAMING_BASE_CAP).reduce((sum, value) => sum + value, 0);
const XP_TO_60 = xpTables.skill.slice(0, TAMING_MAX_CAP).reduce((sum, value) => sum + value, 0);

export function buildTamingAdvisorContext(profile: NormalizedSkyBlockProfile): AdvisorDomainContext {
  const skill = profile.progression.skills.taming;
  const level = skill?.level ?? null;
  const xp = skill?.xp ?? null;
  const observedCap = skill?.maxLevel ?? null;
  const xpToNext = skill?.xpForNext === null || skill?.xpForNext === undefined ? null : Math.max(0, skill.xpForNext - skill.xpCurrent);
  const xpTo50 = xp === null ? null : Math.max(0, XP_TO_50 - xp);
  const xpTo60 = xp === null ? null : Math.max(0, XP_TO_60 - xp);
  const observedGeorgeSubmissions = observedCap === null ? null : Math.max(0, Math.min(10, observedCap - TAMING_BASE_CAP));
  const unlockedServices = level === null ? [] : tamingServiceUnlocks.filter(entry => level >= entry.level);
  const nextServiceUnlocks = level === null ? [] : tamingServiceUnlocks.filter(entry => entry.level > level).slice(0, 2);

  const actions = level === null
    ? [{ kind: "INVESTIGATE" as const, priority: 1, title: "Resolve Taming progress", reason: "Taming XP is not reported." }]
    : level >= TAMING_MAX_CAP
      ? [{ kind: "HOLD" as const, priority: 1, title: "Taming skill cap reached", reason: "The observed Taming level is already 60." }]
      : level >= (observedCap ?? TAMING_BASE_CAP)
        ? [{ kind: "EXTEND_TAMING_CAP" as const, priority: 1, title: "Extend the Taming cap through George",
            reason: "Observed Taming progress is at the currently unlocked cap. Another qualifying George pet submission is required before further levels can be earned." }]
        : [{ kind: "LEVEL_TAMING" as const, priority: 1, title: "Earn Taming XP through Pet XP",
            reason: "Continue earning Pet XP from supported skill activities. Taming XP is derived from Pet XP actually earned rather than directly from raw skill XP." }];

  return {
    domain: "TAMING",
    skill: { level, xp, observedCap, baseCap: TAMING_BASE_CAP, maxCap: TAMING_MAX_CAP, xpToNext, xpTo50, xpTo60 },
    rewards: level === null ? null : {
      petLuck: level * tamingLevelRewards.petLuckPerLevel,
      extraPetXpPercent: level * tamingLevelRewards.extraPetXpPercentPerLevel,
      expSharePercent: level * tamingLevelRewards.expSharePercentPerLevel,
    },
    xpMechanics: {
      petXpConversionRate: { ...tamingXpMechanics.petXpConversionRate },
      unsupportedSkillSources: [...tamingXpMechanics.unsupportedSkillSources],
      note: tamingXpMechanics.note,
      effectiveTamingWisdom: null,
    },
    georgeCap: {
      observedSubmissions: observedGeorgeSubmissions,
      observedCap,
      submissionsMayBeCompletedInAnyOrder: tamingMechanics.georgeSubmissionsMayBeCompletedInAnyOrder,
      requirements: georgeCapRequirements.map(requirement => ({ ...requirement })),
      note: "Submission count is reflected by the normalized Taming maxLevel. Individual pet acquisition, rarity upgrades, and pet recommendations remain in the Pets domain.",
    },
    serviceUnlocks: {
      unlocked: unlockedServices.map(entry => ({ ...entry })),
      next: nextServiceUnlocks.map(entry => ({ ...entry })),
      all: tamingServiceUnlocks.map(entry => ({ ...entry })),
    },
    progressionFocus: { actions },
    unavailableFacts: [
      "Effective Taming Wisdom and temporary Taming XP multipliers are not normalized.",
      "The normalized profile exposes George submission count through the Taming cap, but not a canonical list of which qualifying pet types were submitted; do not infer submitted types from currently owned pets.",
    ],
    note: tamingMechanics.purpose,
  };
}
