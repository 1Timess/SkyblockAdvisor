import { z } from "zod";

export const ownedPetSetupSchema = z.object({
  setupId: z.string().min(1),
  uuid: z.string().nullable(),
  type: z.string(),
  name: z.string(),
  baseRarity: z.string(),
  effectiveRarity: z.string(),
  xp: z.number().nonnegative(),
  level: z.number().nullable(),
  maxLevel: z.number().nullable(),
  xpCurrent: z.number().nullable(),
  xpForNext: z.number().nullable(),
  progress: z.number().nullable(),
  heldItem: z.string().nullable(),
  candyUsed: z.number().nonnegative(),
  skin: z.string().nullable(),
  active: z.boolean(),
  canonicalPetId: z.string().nullable(),
  canonicalPetItemId: z.string().nullable(),
  resolution: z.object({
    petDefinition: z.enum(["RESOLVED", "MISSING"]),
    petItemDefinition: z.enum(["NONE", "RESOLVED", "MISSING"]),
  }),
});
export type OwnedPetSetup = z.infer<typeof ownedPetSetupSchema>;
