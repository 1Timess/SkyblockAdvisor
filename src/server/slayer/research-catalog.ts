import rngSnapshot from "../reference/slayer-rng-options.json";
import { slayerThresholds } from "../skyblock/domains/slayers";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

const bossNames: Record<string, string> = {
  zombie: "Revenant Horror", spider: "Tarantula Broodfather", wolf: "Sven Packmaster",
  enderman: "Voidgloom Seraph", blaze: "Inferno Demonlord", vampire: "Riftstalker Bloodfiend",
};

export function buildSlayerResearchCatalog(profile: Pick<NormalizedSkyBlockProfile, "progression">) {
  return Object.entries(bossNames).map(([id, bossName]) => {
    const observed = profile.progression.slayers[id];
    const thresholds = slayerThresholds[id];
    const nextThreshold = observed && observed.xpReported !== false ? thresholds[observed.level] ?? null : null;
    const scores = rngSnapshot.slayer[bossName as keyof typeof rngSnapshot.slayer];
    return {
      id, bossName, status: observed ? "OBSERVED" as const : "UNREPORTED" as const,
      xp: observed?.xpReported === false ? null : observed?.xp ?? null,
      level: observed?.xpReported === false ? null : observed?.level ?? null,
      nextLevel: nextThreshold === null ? null : observed.level + 1,
      xpToNext: nextThreshold === null ? null : Math.max(0, nextThreshold - observed.xp),
      killsByTier: observed?.killsByTier ?? {},
      claimedRewardKeys: observed?.claimedRewardKeys ?? [],
      possibleRngRewards: Object.entries(scores).map(([neuId, score]) => ({ neuId, meterScore: score })),
    };
  });
}

export const slayerRngSource = rngSnapshot.source;
