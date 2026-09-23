import type { MarketQuote } from "../../schemas/market";
import { loadMarketSnapshot } from "./snapshot-store";

export class MarketService {
  async getPrice(marketKey: string): Promise<MarketQuote | null> { return (await this.getPrices([marketKey])).get(marketKey) ?? null; }
  async getPrices(marketKeys: readonly string[]): Promise<Map<string, MarketQuote>> {
    const snapshot = await loadMarketSnapshot(), result = new Map<string, MarketQuote>();
    if (!snapshot) return result;
    for (const key of new Set(marketKeys.map(value => value.trim()).filter(Boolean))) {
      const quote = snapshot.quotes[key]; if (quote) result.set(key, quote);
    }
    return result;
  }
}
export const marketService = new MarketService();
