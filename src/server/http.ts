import "server-only";
import { AppError } from "./errors";

export type Fetcher = typeof fetch;

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [250, 750];

function upstreamLabel(url: string) {
  const { hostname, pathname } = new URL(url);
  if (hostname === "api.mojang.com" || hostname === "sessionserver.mojang.com" || hostname === "api.minecraftservices.com") return "Minecraft identity lookup";
  if (hostname === "api.hypixel.net") {
    if (pathname === "/v2/skyblock/profiles") return "Hypixel profile lookup";
    if (pathname === "/v2/skyblock/garden") return "Hypixel Garden lookup";
    if (pathname === "/v2/resources/skyblock/items") return "Hypixel item catalog";
    return "Hypixel API request";
  }
  return "Upstream request";
}

function transportFailure(error: unknown) {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return "timed out";
  const cause = error instanceof Error ? error.cause : null;
  const code = cause && typeof cause === "object" && "code" in cause ? cause.code : null;
  return ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(String(code))
    ? `failed to connect (${code})` : "could not be reached";
}

function isRetryableTransportError(error: unknown) {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return true;
  const cause = error instanceof Error ? error.cause : null;
  const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
  return ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(code);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchUpstream(url: string, fetcher: Fetcher, headers?: HeadersInit) {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetcher(url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });

      // GET-only upstream calls are safe to retry when the service reports a transient failure.
      if (response.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (!isRetryableTransportError(error) || attempt === MAX_ATTEMPTS - 1) break;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new AppError(
    "UPSTREAM_UNAVAILABLE",
    `${upstreamLabel(url)} ${transportFailure(lastError)}. Try again shortly.`,
    502,
  );
}

export async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); }
  catch { throw new AppError("INVALID_UPSTREAM_RESPONSE", "The upstream service returned an unreadable response.", 502); }
}
