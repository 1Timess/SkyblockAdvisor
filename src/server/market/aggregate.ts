import type { MarketQuote } from "../../schemas/market";
import type { MarketListing } from "./types";

function median(values: readonly number[]) {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : Math.round((values[middle - 1] + values[middle]) / 2);
}

export function aggregateMarketListings(listings: readonly MarketListing[], observedAt: string): Record<string, MarketQuote> {
  const grouped = new Map<string, number[]>();
  for (const listing of listings) {
    if (!Number.isSafeInteger(listing.coins) || listing.coins < 0 || !listing.marketKey.trim()) continue;
    grouped.set(listing.marketKey, [...(grouped.get(listing.marketKey) ?? []), listing.coins]);
  }
  const quotes: Record<string, MarketQuote> = {};
  for (const [marketKey, unsorted] of grouped) {
    const prices = [...unsorted].sort((a, b) => a - b);
    if (prices.length >= 5) {
      quotes[marketKey] = { marketKey, coins: median(prices.slice(0, 5)), observedAt, basis: "MEDIAN_LOWEST_FIVE", confidence: "HIGH" };
    } else if (prices.length >= 2) {
      quotes[marketKey] = { marketKey, coins: prices[1], observedAt, basis: "OTHER", confidence: "MEDIUM" };
    } else {
      quotes[marketKey] = { marketKey, coins: prices[0], observedAt, basis: "LOWEST_BIN", confidence: "LOW" };
    }
  }
  return quotes;
}
