import { z } from "zod";
import { petMutationSchema } from "./pet-mutations";
import { petProgressionDomainSchema } from "./pet-domain-relevance";

export const petMutationFamilySchema = z.object({
  familyId: z.string().min(1),
  domain: petProgressionDomainSchema,
  kind: z.enum(["ACQUIRE_FAMILY", "CONCRETE_MUTATION"]),
  petType: z.string(),
  sourceSetupId: z.string().nullable(),
  children: z.array(petMutationSchema).min(1),
});

export type PetMutationFamily = z.infer<typeof petMutationFamilySchema>;
