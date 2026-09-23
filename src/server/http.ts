import "server-only";
import { AppError } from "./errors";

export type Fetcher = typeof fetch;

export async function fetchUpstream(url: string, fetcher: Fetcher, headers?: HeadersInit) {
  try {
    return await fetcher(url, { headers, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new AppError("UPSTREAM_UNAVAILABLE", "The upstream service could not be reached. Try again shortly.", 502);
  }
}

export async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); }
  catch { throw new AppError("INVALID_UPSTREAM_RESPONSE", "The upstream service returned an unreadable response.", 502); }
}
