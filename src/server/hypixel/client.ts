import "server-only";
import { z } from "zod";
import { getServerEnv } from "../env";
import { TtlCache } from "../cache/ttl-cache";
import { AppError } from "../errors";
import { fetchUpstream, readJson, type Fetcher } from "../http";
import { itemDefinitionSchema, rawProfileSchema } from "./types";

const envelope = z.object({ success: z.boolean() });
const profilesSchema = z.object({ profiles: z.array(rawProfileSchema).nullable() });
const playerSchema = z.object({ player: z.record(z.string(), z.unknown()).nullable() });
const itemsSchema = z.object({ items: z.array(itemDefinitionSchema) });
const collectionsSchema = z.object({ version: z.string().optional(), lastUpdated: z.number().optional(),
  collections: z.record(z.string(), z.unknown()) });
const gardenSchema = z.object({ garden: z.record(z.string(), z.unknown()) });
const auctionsSchema = z.object({ page: z.number(), totalPages: z.number(), auctions: z.array(z.object({
  item_name: z.string(), starting_bid: z.number(), bin: z.boolean().optional(),
})) });

export class HypixelClient {
  constructor(private fetcher: Fetcher = fetch, private cache = new TtlCache(), private apiKey = () => getServerEnv().HYPIXEL_API_KEY) {}

  private async request<T>(path: string, ttl: number, schema: z.ZodType<T>, authenticated = true): Promise<T> {
    const cached = this.cache.get<T>(path);
    if (cached) return cached;
    const response = await fetchUpstream(`https://api.hypixel.net/v2/${path}`, this.fetcher,
      authenticated ? { "API-Key": this.apiKey() } : undefined);
    if (response.status === 429) throw new AppError("HYPIXEL_RATE_LIMITED", "Hypixel rate limit reached. Try again shortly.", 503);
    if (response.status === 403 || response.status === 401) throw new AppError("HYPIXEL_AUTH_FAILED", "The server's Hypixel API key was rejected.", 503);
    if (!response.ok) throw new AppError("HYPIXEL_UPSTREAM_ERROR", "Hypixel could not complete the request.", 502);
    const raw = await readJson(response);
    const status = envelope.safeParse(raw);
    if (!status.success || !status.data.success) throw new AppError("HYPIXEL_UPSTREAM_ERROR", "Hypixel returned an unsuccessful response.", 502);
    const result = schema.safeParse(raw);
    if (!result.success) throw new AppError("HYPIXEL_CONTRACT_MISMATCH", "Hypixel returned data outside the supplied source contract.", 502);
    this.cache.set(path, result.data, ttl);
    return result.data;
  }

  async getProfiles(uuid: string) { return (await this.request(`skyblock/profiles?uuid=${encodeURIComponent(uuid)}`, 300, profilesSchema)).profiles ?? []; }
  async getPlayer(uuid: string) { return (await this.request(`player?uuid=${encodeURIComponent(uuid)}`, 300, playerSchema)).player; }
  async getItems() { return (await this.request("resources/skyblock/items", 43200, itemsSchema, false)).items; }
  async getLowestBinPrices(names: string[]) {
    const normalize = (name: string) => name
      .replace(/[§&][0-9a-fk-or]/gi, "")
      .replace(/\\s+/g, " ")
      .trim()
      .toLowerCase();
    const wanted = new Map(names.map(name => [normalize(name), name]));
    const prices: Record<string, number> = {};
    const consume = (auctions: z.infer<typeof auctionsSchema>["auctions"]) => {
      for (const auction of auctions) {
        if (auction.bin !== true) continue;
        const canonicalName = wanted.get(normalize(auction.item_name));
        if (!canonicalName) continue;
        const current = prices[canonicalName];
        if (current === undefined || auction.starting_bid < current) {
          prices[canonicalName] = auction.starting_bid;
        }
      }
    };

    // The public auctions endpoint is intentionally unauthenticated and has no API-key
    // rate limit. Keep it separate from player/profile API traffic.
    const first = await this.request("skyblock/auctions?page=0", 60, auctionsSchema, false);
    consume(first.auctions);

    // The auction house can refresh while we're walking the pages. Treat an individual
    // missing page as a stale snapshot rather than throwing away prices already found.
    for (let start = 1; start < first.totalPages; start += 16) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(16, first.totalPages - start) }, (_, offset) =>
          this.request(`skyblock/auctions?page=${start + offset}`, 60, auctionsSchema, false)
            .catch(() => null)
        )
      );
      batch.forEach(page => { if (page) consume(page.auctions); });
    }
    return prices;
  }
  async getCollections() { return this.request("resources/skyblock/collections", 43200, collectionsSchema, false); }
  async getGarden(profileId: string) {
    const path = `skyblock/garden?profile=${encodeURIComponent(profileId)}`;
    const cached = this.cache.get<z.infer<typeof gardenSchema>["garden"]>(path);
    if (cached) return cached;
    const response = await fetchUpstream(`https://api.hypixel.net/v2/${path}`, this.fetcher, { "API-Key": this.apiKey() });
    if (response.status === 404) return null;
    if (response.status === 429) throw new AppError("HYPIXEL_RATE_LIMITED", "Hypixel rate limit reached. Try again shortly.", 503);
    if (response.status === 401 || response.status === 403) throw new AppError("HYPIXEL_AUTH_FAILED", "The server's Hypixel API key was rejected.", 503);
    if (!response.ok) throw new AppError("HYPIXEL_UPSTREAM_ERROR", "Hypixel could not complete the request.", 502);
    const raw = await readJson(response), status = envelope.safeParse(raw), parsed = gardenSchema.safeParse(raw);
    if (!status.success || !status.data.success || !parsed.success)
      throw new AppError("HYPIXEL_CONTRACT_MISMATCH", "Hypixel returned data outside the supplied source contract.", 502);
    this.cache.set(path, parsed.data.garden, 300);
    return parsed.data.garden;
  }
}

export const hypixelClient = new HypixelClient();
