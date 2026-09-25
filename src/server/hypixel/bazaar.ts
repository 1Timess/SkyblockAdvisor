import "server-only";
import { z } from "zod";
import { fetchUpstream, readJson, type Fetcher } from "../http";

const quickStatusSchema = z.object({
  productId: z.string(),
  sellPrice: z.number().finite().nonnegative(),
  buyPrice: z.number().finite().nonnegative(),
}).passthrough();

const bazaarSchema = z.object({
  success: z.literal(true),
  lastUpdated: z.number().int().nonnegative(),
  products: z.record(z.string(), z.object({ product_id: z.string(), quick_status: quickStatusSchema }).passthrough()),
});

export type BazaarSnapshot = z.infer<typeof bazaarSchema>;

export async function fetchBazaar(fetcher: Fetcher = fetch): Promise<BazaarSnapshot> {
  const response = await fetchUpstream("https://api.hypixel.net/v2/skyblock/bazaar", fetcher);
  if (!response.ok) throw new Error(`Hypixel Bazaar request failed with status ${response.status}.`);
  const parsed = bazaarSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new Error("Hypixel Bazaar returned data outside the supplied source contract.");
  return parsed.data;
}
