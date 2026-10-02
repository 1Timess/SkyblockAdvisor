import "server-only";
import { z } from "zod";
import { TtlCache } from "../cache/ttl-cache";
import { AppError } from "../errors";
import { fetchUpstream, type Fetcher } from "../http";

export const UUID = /^[a-f0-9]{32}$/i;
const HYPHENATED_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const identitySchema = z.object({ id: z.string().regex(UUID), name: z.string().min(1) });
const cache = new TtlCache();
export type Identity = { uuid: string; username: string };

export function validatePlayerInput(input: string): string {
  const trimmed = input.trim();
  if (!UUID.test(trimmed) && !HYPHENATED_UUID.test(trimmed) && !/^[A-Za-z0-9_]{1,16}$/.test(trimmed)) {
    throw new AppError("INVALID_USERNAME", "Provide a Minecraft username or UUID.", 400);
  }
  return trimmed;
}

export async function resolvePlayer(input: string, fetcher: Fetcher = fetch, store = cache): Promise<Identity> {
  const valid = validatePlayerInput(input);
  const isUuid = UUID.test(valid) || HYPHENATED_UUID.test(valid);
  const key = isUuid ? valid.replaceAll("-", "").toLowerCase() : valid.toLowerCase();
  const cached = store.get<Identity>(key);
  if (cached) return cached;

  const urls = isUuid
    ? [
        `https://sessionserver.mojang.com/session/minecraft/profile/${key}`,
        `https://api.minecraftservices.com/minecraft/profile/lookup/${key}`,
      ]
    : [
        `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(valid)}`,
        `https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(valid)}`,
      ];

  let lastError: AppError | null = null;
  for (const url of urls) {
    try {
      const response = await fetchUpstream(url, fetcher);
      if (response.status === 404 || response.status === 204) {
        lastError = new AppError("PLAYER_NOT_FOUND", "Minecraft player not found.", 404);
        continue;
      }
      if (!response.ok) {
        lastError = new AppError("IDENTITY_UPSTREAM_ERROR", "Minecraft identity lookup failed.", 502);
        continue;
      }

      const body = await response.text();
      if (!body.trim()) {
        lastError = new AppError("EMPTY_IDENTITY_RESPONSE", "Minecraft identity service returned an empty response.", 502);
        continue;
      }

      let parsed: unknown;
      try { parsed = JSON.parse(body); }
      catch {
        lastError = new AppError("INVALID_IDENTITY", "Minecraft identity service returned an invalid response.", 502);
        continue;
      }

      const result = identitySchema.safeParse(parsed);
      if (!result.success) {
        lastError = new AppError("INVALID_IDENTITY", "Minecraft identity service returned an invalid response.", 502);
        continue;
      }

      const identity = { uuid: result.data.id.toLowerCase(), username: result.data.name };
      store.set(identity.uuid, identity, 86400);
      store.set(identity.username.toLowerCase(), identity, 86400);
      return identity;
    } catch (error) {
      if (error instanceof AppError) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new AppError("IDENTITY_UPSTREAM_ERROR", "Minecraft identity lookup failed.", 502);
}
