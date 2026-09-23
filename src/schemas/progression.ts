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
});
export const dungeonSchema = z.object({
  catacombs: levelSchema.nullable(), selectedClass: z.string().nullable(),
  classes: z.record(z.string(), levelSchema), classAverage: z.number().nullable(),
  floorCompletions: z.object({ normal: counts, master: counts }),
  highestFloorNormal: z.number().nullable(), highestFloorMaster: z.number().nullable(),
  secretsFound: z.number().optional(),
});
