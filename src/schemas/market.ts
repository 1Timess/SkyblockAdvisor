import { z } from "zod";

export const marketBasisSchema = z.enum(["LOWEST_BIN", "MEDIAN_LOWEST_FIVE", "BAZAAR", "OTHER"]);
export const marketConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const marketQuoteSchema = z.object({
  marketKey: z.string().min(1), coins: z.number().int().nonnegative(), observedAt: z.string().datetime(),
  basis: marketBasisSchema, confidence: marketConfidenceSchema,
});
export type MarketQuote = z.infer<typeof marketQuoteSchema>;

export const marketSnapshotSchema = z.object({
  version: z.literal(1), snapshotId: z.string().min(1), hypixelLastUpdated: z.number().int().nonnegative(),
  observedAt: z.string().datetime(), completedAt: z.string().datetime(), pagesFetched: z.number().int().positive(),
  auctionsObserved: z.number().int().nonnegative(), binListingsAccepted: z.number().int().nonnegative(),
  quotes: z.record(z.string(), marketQuoteSchema),
});
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
