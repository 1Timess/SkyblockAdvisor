import "server-only";
import { z } from "zod";
import { getServerEnv } from "../env";
import { AppError } from "../errors";
import { fetchUpstream, readJson, type Fetcher } from "../http";

const auctionSchema = z.object({
  uuid: z.string(), auctioneer: z.string(), profile_id: z.string(), start: z.number(), end: z.number(),
  item_name: z.string(), tier: z.string().optional(), category: z.string().optional(), starting_bid: z.number().nonnegative(),
  item_bytes: z.string(), highest_bid_amount: z.number().nonnegative().optional(), bin: z.boolean().optional(),
});
const pageSchema = z.object({
  success: z.literal(true), page: z.number().int().nonnegative(), totalPages: z.number().int().positive(),
  totalAuctions: z.number().int().nonnegative(), lastUpdated: z.number().int().nonnegative(), auctions: z.array(auctionSchema),
});
export type HypixelAuction = z.infer<typeof auctionSchema>;
export type AuctionPage = z.infer<typeof pageSchema>;

export async function fetchAuctionPage(page: number, fetcher: Fetcher = fetch, apiKey = getServerEnv().HYPIXEL_API_KEY): Promise<AuctionPage> {
  if (!Number.isInteger(page) || page < 0) throw new Error(`Auction page must be a non-negative integer. Received ${page}.`);
  const response = await fetchUpstream(`https://api.hypixel.net/v2/skyblock/auctions?page=${page}`, fetcher, { "API-Key": apiKey, Accept: "application/json" });
  if (response.status === 429) throw new AppError("HYPIXEL_RATE_LIMITED", "Hypixel rate limit reached during auction sync.", 503);
  if (response.status === 401 || response.status === 403) throw new AppError("HYPIXEL_AUTH_FAILED", "The server's Hypixel API key was rejected.", 503);
  if (!response.ok) throw new AppError("HYPIXEL_UPSTREAM_ERROR", `Hypixel auction page ${page} failed.`, 502);
  const result = pageSchema.safeParse(await readJson(response));
  if (!result.success) throw new AppError("HYPIXEL_CONTRACT_MISMATCH", `Hypixel auction page ${page} did not match the supplied contract.`, 502);
  return result.data;
}
