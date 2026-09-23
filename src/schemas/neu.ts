import { z } from "zod";

export const neuItemSchema = z.object({
  internalname: z.string().min(1), displayname: z.string().optional(), lore: z.array(z.string()).optional(),
  nbttag: z.string().optional(), damage: z.number().optional(), recipe: z.record(z.string(), z.unknown()).optional(),
  recipes: z.array(z.unknown()).optional(), slayer_req: z.string().optional(), crafttext: z.string().optional(),
  infoType: z.string().optional(), info: z.array(z.string()).optional(), modver: z.string().optional(),
}).passthrough();
export type NeuItem = z.infer<typeof neuItemSchema>;

export const neuMetadataSchema = z.object({
  provider: z.literal("neu"), repository: z.string(), branch: z.string(), etag: z.string().nullable(),
  downloadedAt: z.string().datetime(), itemCount: z.number().int().nonnegative(),
});
export type NeuMetadata = z.infer<typeof neuMetadataSchema>;
