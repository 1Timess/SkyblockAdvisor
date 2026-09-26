import { z } from "zod";

export const petMutationKindSchema = z.enum(["ACQUIRE", "KAT_UPGRADE", "CHANGE_HELD_ITEM", "LEVEL_TARGET"]);
export const petMutationAssessmentSchema = z.enum(["PROGRESSION", "SIDEGRADE", "NO_OP", "UNCERTAIN"]);

export const petMutationSetupStateSchema = z.object({
  type: z.string(),
  canonicalPetId: z.string(),
  baseRarity: z.string(),
  effectiveRarity: z.string(),
  level: z.number().int().positive(),
  maxLevel: z.number().int().positive(),
  heldItem: z.string().nullable(),
});

export const petMutationSchema = z.object({
  mutationId: z.string().min(1),
  kind: petMutationKindSchema,
  assessment: petMutationAssessmentSchema,
  sourceSetupId: z.string().nullable(),
  before: petMutationSetupStateSchema.nullable(),
  after: petMutationSetupStateSchema,
  requirements: z.object({
    coins: z.number().nonnegative().nullable(),
    timeSeconds: z.number().nonnegative().nullable(),
    itemCosts: z.array(z.object({ itemId: z.string(), count: z.number().positive() })),
    marketPriceRequired: z.boolean(),
  }),
  reasons: z.array(z.string()),
  uncertainty: z.array(z.string()),
});

export type PetMutation = z.infer<typeof petMutationSchema>;
export type PetMutationSetupState = z.infer<typeof petMutationSetupStateSchema>;
