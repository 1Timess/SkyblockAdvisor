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
}

export const hypixelClient = new HypixelClient();
