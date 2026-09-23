import { marketSnapshotSchema } from "../../schemas/market";
import { fetchAuctionPage, type AuctionPage } from "../hypixel/auctions";
import { aggregateMarketListings } from "./aggregate";
import { normalizeAuctionListing } from "./normalize-auction";
import { saveMarketSnapshot } from "./snapshot-store";
import type { MarketListing, MarketSyncResult } from "./types";

export class AuctionSnapshotChangedError extends Error {}

export async function syncAuctionSnapshot(options: {
  fetchPage?: (page: number) => Promise<AuctionPage>;
  save?: typeof saveMarketSnapshot;
  now?: () => number;
} = {}): Promise<MarketSyncResult> {
  const startedAt = Date.now(), fetchPage = options.fetchPage ?? fetchAuctionPage, save = options.save ?? saveMarketSnapshot, now = options.now ?? Date.now;
  const first = await fetchPage(0), listings: MarketListing[] = [];
  let auctionsObserved = 0;
  for (let pageNumber = 0; pageNumber < first.totalPages; pageNumber++) {
    const page = pageNumber === 0 ? first : await fetchPage(pageNumber);
    if (page.lastUpdated !== first.lastUpdated || page.totalPages !== first.totalPages || page.totalAuctions !== first.totalAuctions) {
      throw new AuctionSnapshotChangedError(`Auction snapshot changed while reading page ${pageNumber}.`);
    }
    auctionsObserved += page.auctions.length;
    for (const auction of page.auctions) {
      const listing = await normalizeAuctionListing(auction, now()); if (listing) listings.push(listing);
    }
  }
  if (auctionsObserved !== first.totalAuctions) throw new Error(`Auction count mismatch: expected ${first.totalAuctions}, received ${auctionsObserved}.`);
  const observedAt = new Date(first.lastUpdated).toISOString(), completedAt = new Date(now()).toISOString();
  const quotes = aggregateMarketListings(listings, observedAt);
  const snapshot = marketSnapshotSchema.parse({ version: 1, snapshotId: `auction-${first.lastUpdated}`, hypixelLastUpdated: first.lastUpdated,
    observedAt, completedAt, pagesFetched: first.totalPages, auctionsObserved, binListingsAccepted: listings.length, quotes });
  await save(snapshot);
  return { snapshotId: snapshot.snapshotId, hypixelLastUpdated: first.lastUpdated, pagesFetched: first.totalPages,
    auctionsObserved, binListingsAccepted: listings.length, quoteCount: Object.keys(quotes).length, durationMs: Date.now() - startedAt };
}
