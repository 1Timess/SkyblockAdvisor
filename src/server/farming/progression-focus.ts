import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

const composter = [
  { key: "speed", name: "Composter Speed", gardenLevel: 2, effect: "+20% production speed per tier" },
  { key: "multi_drop", name: "Multi Drop", gardenLevel: 4, effect: "+3% extra compost chance per tier" },
  { key: "fuel_cap", name: "Fuel Cap", gardenLevel: 6, effect: "+30,000 fuel capacity per tier" },
  { key: "organic_matter_cap", name: "Organic Matter Cap", gardenLevel: 8, effect: "+30,000 organic matter capacity per tier" },
  { key: "cost_reduction", name: "Cost Reduction", gardenLevel: 10, effect: "-1% organic matter and fuel use per tier" },
] as const;

export function farmingSkillFocus(profile: NormalizedSkyBlockProfile) {
  const skill = profile.progression.skills.farming;
  if (!skill) return { cap: null, capEvidence: "UNREPORTED" as const, nextLevel: null };
  const jacob = profile.otherProgression.jacobsContest;
  const perks = jacob && typeof jacob === "object" && "perks" in jacob ? jacob.perks : null;
  const capReported = perks && typeof perks === "object" && "farming_level_cap" in perks
    && typeof perks.farming_level_cap === "number";
  return { cap: skill.maxLevel, capEvidence: capReported ? "REPORTED_PERK" as const : "BASE_CAP_ASSUMED" as const,
    nextLevel: skill.maxed || skill.xpForNext === null ? null
    : { level: skill.level + 1, xpRemaining: Math.max(0, skill.xpForNext - skill.xpCurrent) } };
}

export function composterFocus(upgrades: Record<string, number>, gardenLevel: number | null) {
  return composter.map(entry => ({ ...entry,
    observedLevel: Object.hasOwn(upgrades, entry.key) ? upgrades[entry.key] : null,
    levelAccess: gardenLevel === null ? "UNREPORTED" as const
      : gardenLevel >= entry.gardenLevel ? "LEVEL_ELIGIBLE" as const : "FUTURE_LEVEL" as const,
    nextCostStatus: "UNREPORTED" as const }));
}
