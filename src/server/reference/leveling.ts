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
