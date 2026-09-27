import { z } from "zod";

export const experimentObservationSchema = z.object({
  status: z.enum(["ABSENT", "PRESENT", "MALFORMED"]),
  serumsDrank: z.number().int().nonnegative().nullable(),
  history: z.record(z.enum(["chronomatron", "ultrasequencer", "superpairs"]), z.object({
    attempts: z.record(z.string(), z.number().int().nonnegative()),
    claims: z.record(z.string(), z.number().int().nonnegative()),
    bestScores: z.record(z.string(), z.number().nonnegative()),
    bonusClicks: z.number().int().nonnegative().nullable(),
  })),
});

export const ownedEnchantingStateSchema = z.object({
  skill: z.object({ xp: z.number().nonnegative(), level: z.number().int().min(0).max(60) }).nullable(),
  experimentation: experimentObservationSchema,
});

export type OwnedEnchantingState = z.infer<typeof ownedEnchantingStateSchema>;
