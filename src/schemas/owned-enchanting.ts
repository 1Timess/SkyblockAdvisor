import { z } from "zod";

export const experimentObservationSchema = z.object({
  status: z.enum(["ABSENT", "PRESENT", "MALFORMED"]),
  keys: z.array(z.string()),
  sections: z.object({
    chronomatron: z.array(z.string()),
    ultrasequencer: z.array(z.string()),
    superpairs: z.array(z.string()),
  }),
  chargeTrackTimestamp: z.number().nonnegative().nullable(),
  claimsResets: z.number().int().nonnegative().nullable(),
  claimsResetsTimestamp: z.number().nonnegative().nullable(),
  serumsDrank: z.number().int().nonnegative().nullable(),
  claimedRetroactiveRng: z.boolean().nullable(),
  history: z.record(z.enum(["chronomatron", "ultrasequencer", "superpairs"]), z.object({
    attempts: z.record(z.string(), z.number().int().nonnegative()),
    claims: z.record(z.string(), z.number().int().nonnegative()),
    bestScores: z.record(z.string(), z.number().nonnegative()),
    bonusClicks: z.number().int().nonnegative().nullable(),
    lastAttempt: z.number().nonnegative().nullable(),
    lastClaimed: z.number().nonnegative().nullable(),
    claimed: z.boolean().nullable(),
  })),
  // A timestamp alone cannot prove whether a free charge or paid reset is available.
  attemptAvailability: z.literal("UNKNOWN"),
});

export const ownedEnchantingStateSchema = z.object({
  skill: z.object({ xp: z.number().nonnegative(), level: z.number().int().min(0).max(60) }).nullable(),
  experimentation: experimentObservationSchema,
});

export type OwnedEnchantingState = z.infer<typeof ownedEnchantingStateSchema>;
