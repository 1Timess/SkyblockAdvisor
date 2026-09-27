import { z } from "zod";

export const experimentObservationSchema = z.object({
  status: z.enum(["ABSENT", "PRESENT", "MALFORMED"]),
  keys: z.array(z.string()),
  sections: z.object({
    chronomatron: z.array(z.string()),
    ultrasequencer: z.array(z.string()),
    superpairs: z.array(z.string()),
  }),
  // A timestamp alone cannot prove whether a free charge or paid reset is available.
  attemptAvailability: z.literal("UNKNOWN"),
});

export const ownedEnchantingStateSchema = z.object({
  skill: z.object({ xp: z.number().nonnegative(), level: z.number().int().min(0).max(60) }).nullable(),
  experimentation: experimentObservationSchema,
});

export type OwnedEnchantingState = z.infer<typeof ownedEnchantingStateSchema>;
