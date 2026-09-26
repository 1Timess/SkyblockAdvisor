import { z } from "zod";
import { petMutationSchema } from "./pet-mutations";

export const petMarketQuoteSchema = z.object({
  key: z.string().min(1),
  coins: z.number().nonnegative(),
  observedAt: z.string().nullable(),
  source: z.string().min(1),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
});

export const petMarketListingSchema = z.object({
  listingId: z.string().min(1),
  canonicalPetId: z.string().min(1),
  level: z.number().int().positive(),
  coins: z.number().nonnegative(),
  observedAt: z.string().nullable(),
  source: z.string().min(1),
});

export const petLevelBucketSchema = z.object({
  canonicalPetId: z.string().min(1),
  minLevel: z.number().int().positive(),
  maxLevel: z.number().int().positive(),
  sampleCount: z.number().int().nonnegative(),
  representative: petMarketListingSchema.nullable(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
});

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


export type PetMarketListing = z.infer<typeof petMarketListingSchema>;
export type PetLevelBucket = z.infer<typeof petLevelBucketSchema>;
