import { z } from "zod";
import { petMutationSchema } from "./pet-mutations";

export const petMarketQuoteSchema = z.object({
  key: z.string().min(1),
  coins: z.number().nonnegative(),
  observedAt: z.string().nullable(),
  source: z.string().min(1),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
});

export const petAcquisitionEnvelopeSchema = z.object({
  canonicalPetId: z.string().min(1),
  minLevel: z.number().int().positive(),
  maxLevel: z.number().int().positive(),
  lowLevelQuote: petMarketQuoteSchema.nullable(),
  maxLevelQuote: petMarketQuoteSchema.nullable(),
}).refine(value => value.maxLevel >= value.minLevel, { message: "maxLevel must be >= minLevel" });

export const pricedPetMutationSchema = z.object({
  mutation: petMutationSchema,
  costStatus: z.enum(["RESOLVED", "PARTIAL", "UNRESOLVED"]),
  fixedCoins: z.number().nonnegative(),
  marketCoins: z.number().nonnegative(),
  totalCoins: z.number().nonnegative().nullable(),
  quotes: z.array(petMarketQuoteSchema),
  unresolvedKeys: z.array(z.string()),
});

export type PetMarketQuote = z.infer<typeof petMarketQuoteSchema>;
export type PricedPetMutation = z.infer<typeof pricedPetMutationSchema>;

export type PetAcquisitionEnvelope = z.infer<typeof petAcquisitionEnvelopeSchema>;
