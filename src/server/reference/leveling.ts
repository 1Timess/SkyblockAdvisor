import type { LevelProgress } from "../../schemas/progression";

// Supplemental contract §5.9. Costs are incremental, indexed from level 1.
export function levelFromXp(xp: number, costs: number[], levelCap: number, infinite = false): LevelProgress {
  let remaining = Math.max(0, Math.floor(xp));
  let uncappedLevel = 0;
  let xpCurrent = remaining;
  while (costs[uncappedLevel] !== undefined && costs[uncappedLevel] <= remaining) {
    remaining -= costs[uncappedLevel++];
    if (uncappedLevel <= levelCap) xpCurrent = remaining;
  }
  const lastCost = costs.at(-1)!;
  if (infinite) {
    uncappedLevel += Math.floor(remaining / lastCost);
    remaining %= lastCost;
    xpCurrent = remaining;
  }
  const level = infinite ? uncappedLevel : Math.min(levelCap, uncappedLevel);
  const nextCost = costs[level] ?? (infinite ? lastCost : null);
  const progress = nextCost && nextCost > 0 ? Math.max(0, Math.min(xpCurrent / nextCost, 1)) : 0;
  return { xp, level, maxLevel: levelCap, xpCurrent, xpForNext: nextCost, progress,
    levelWithProgress: infinite ? uncappedLevel + progress : Math.min(levelCap, uncappedLevel + progress),
    maxed: !infinite && level >= levelCap };
}

// Owner-supplied cumulative HOTM thresholds, indexed by tier minus one.
export const hotmCumulativeXp = [0, 3_000, 12_000, 37_000, 97_000, 197_000, 347_000, 557_000, 847_000, 1_247_000] as const;

export function hotmLevelFromXp(xp: number | null | undefined): number | null {
  if (xp === null || xp === undefined) return null;
  const normalized = Math.max(0, Math.floor(xp));
  let tier = 1;
  for (let index = 1; index < hotmCumulativeXp.length; index++) {
    if (normalized < hotmCumulativeXp[index]) break;
    tier = index + 1;
  }
  return tier;
}
