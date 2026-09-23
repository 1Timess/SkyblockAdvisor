export interface MarketListing { marketKey: string; coins: number }
export interface MarketSyncResult {
  snapshotId: string; hypixelLastUpdated: number; pagesFetched: number; auctionsObserved: number;
  binListingsAccepted: number; quoteCount: number; durationMs: number;
}
