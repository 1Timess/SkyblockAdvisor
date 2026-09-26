import { z } from "zod";

export const petProgressionDomainSchema = z.enum([
  "MINING", "FARMING", "FORAGING", "COMBAT", "FISHING", "ENCHANTING", "ALCHEMY", "TAMING", "GENERAL",
]);

export const petDomainEvidenceSchema = z.object({
  source: z.enum(["PET_EFFECT", "PET_CONDITION", "PET_ITEM_EFFECT", "PET_ITEM_CONDITION", "PET_SKILL_TYPE"]),
  domain: petProgressionDomainSchema,
  mechanic: z.string(),
  rawText: z.string().nullable(),
});

export const petDomainRelevanceSchema = z.object({
  domain: petProgressionDomainSchema,
  relevant: z.boolean(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  evidence: z.array(petDomainEvidenceSchema),
  unresolvedMechanics: z.array(z.string()),
});

export type PetProgressionDomain = z.infer<typeof petProgressionDomainSchema>;
export type PetDomainEvidence = z.infer<typeof petDomainEvidenceSchema>;
export type PetDomainRelevance = z.infer<typeof petDomainRelevanceSchema>;
