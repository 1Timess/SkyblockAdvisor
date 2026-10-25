import { z } from "zod";

export const levelSchema = z.object({
  xp: z.number().nonnegative(), level: z.number().nonnegative(), maxLevel: z.number().nonnegative(),
  xpCurrent: z.number().nonnegative(), xpForNext: z.number().nonnegative().nullable(),
  progress: z.number().min(0).max(1), levelWithProgress: z.number().nonnegative(), maxed: z.boolean(),
});
export type LevelProgress = z.infer<typeof levelSchema>;
const counts = z.record(z.string(), z.number().nonnegative());
export const slayerSchema = z.object({
  id: z.string(), xp: z.number().nonnegative(), level: z.number().nonnegative(), maxLevel: z.number().nonnegative(),
  killsByTier: counts, totalKills: z.number().nonnegative(),
  xpReported: z.boolean().optional(), claimedRewardKeys: z.array(z.string()).optional(),
});
export const dungeonSchema = z.object({
  catacombs: levelSchema.nullable(), selectedClass: z.string().nullable(),
  classes: z.record(z.string(), levelSchema), classAverage: z.number().nullable(),
  floorCompletions: z.object({ normal: counts, master: counts }),
  highestFloorNormal: z.number().nullable(), highestFloorMaster: z.number().nullable(),
  secretsFound: z.number().optional(),
  bossCollections: z.array(z.object({
    floor: z.string(), name: z.string(), total: z.number().nullable(),
    normal: z.number().nullable(), master: z.number().nullable(),
    tier: z.number().nullable(), maxTier: z.number(), nextMilestone: z.number().nullable(),
    progress: z.number().min(0).max(1).nullable(),
  })),
  floorRecords: z.object({ normal: z.record(z.string(), z.object({
  completions: z.number().nullable(), runsPlayed: z.number().nullable(), bestScore: z.number().nullable(),
  fastestTimeMs: z.number().nullable(), fastestSTimeMs: z.number().nullable(),
  fastestSPlusTimeMs: z.number().nullable(), mobsKilled: z.number().nullable(), mostMobsKilled: z.number().nullable(),
})), master: z.record(z.string(), z.object({
  completions: z.number().nullable(), runsPlayed: z.number().nullable(), bestScore: z.number().nullable(),
  fastestTimeMs: z.number().nullable(), fastestSTimeMs: z.number().nullable(),
  fastestSPlusTimeMs: z.number().nullable(), mobsKilled: z.number().nullable(), mostMobsKilled: z.number().nullable(),
})) }),
});
