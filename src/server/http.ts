import "server-only";
import { AppError } from "./errors";

export type Fetcher = typeof fetch;

function upstreamLabel(url: string) {
  const { hostname, pathname } = new URL(url);
  if (hostname === "api.mojang.com" || hostname === "sessionserver.mojang.com") return "Minecraft identity lookup";
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

export async function fetchUpstream(url: string, fetcher: Fetcher, headers?: HeadersInit) {
  try {
    return await fetcher(url, { headers, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", `${upstreamLabel(url)} ${transportFailure(error)}. Try again shortly.`, 502);
  }
}

export async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); }
  catch { throw new AppError("INVALID_UPSTREAM_RESPONSE", "The upstream service returned an unreadable response.", 502); }
}
