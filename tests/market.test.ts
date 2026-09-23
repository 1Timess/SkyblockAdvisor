import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { aggregateMarketListings } from "../src/server/market/aggregate";
import { resolveMarketKey } from "../src/server/market/identity";
import { normalizeAuctionListing } from "../src/server/market/normalize-auction";
import { loadMarketSnapshot, saveMarketSnapshot } from "../src/server/market/snapshot-store";
import { AuctionSnapshotChangedError, syncAuctionSnapshot } from "../src/server/market/sync";
import type { AuctionPage, HypixelAuction } from "../src/server/hypixel/auctions";
import { encodeInventory } from "./fixtures/profile";

const observedAt = "2026-01-01T00:00:00.000Z";

test("market aggregation uses depth-aware prices from one local batch", () => {
  const quotes = aggregateMarketListings([
    { marketKey: "ONE", coins: 10 },
    { marketKey: "TWO", coins: 10 }, { marketKey: "TWO", coins: 20 },
    ...[10, 20, 30, 40, 500].map(coins => ({ marketKey: "FIVE", coins })),
  ], observedAt);
  assert.deepEqual(quotes.ONE, { marketKey: "ONE", coins: 10, observedAt, basis: "LOWEST_BIN", confidence: "LOW" });
  assert.deepEqual(quotes.TWO, { marketKey: "TWO", coins: 20, observedAt, basis: "OTHER", confidence: "MEDIUM" });
  assert.deepEqual(quotes.FIVE, { marketKey: "FIVE", coins: 30, observedAt, basis: "MEDIAN_LOWEST_FIVE", confidence: "HIGH" });
});

test("market identity keeps generic IDs simple and separates known pet families", () => {
  assert.equal(resolveMarketKey("ASPECT_OF_THE_END", {}), "ASPECT_OF_THE_END");
  assert.equal(resolveMarketKey("PET", { petInfo: JSON.stringify({ type: "SHEEP", tier: "LEGENDARY" }) }), "PET:SHEEP:LEGENDARY");
  assert.equal(resolveMarketKey("PET", { petInfo: "invalid" }), null);
  assert.equal(resolveMarketKey("RUNE", {}), null);
});

function auction(overrides: Partial<HypixelAuction> = {}): HypixelAuction {
  return { uuid: "auction", auctioneer: "owner", profile_id: "profile", start: 1, end: Date.now() + 60_000,
    item_name: "Fixture", starting_bid: 123, item_bytes: encodeInventory([{ id: "FIXTURE", lore: ["RARE SWORD"] }]), bin: true, ...overrides };
}

test("auction normalization decodes canonical ID and ignores non-BIN or expired listings", async () => {
  assert.deepEqual(await normalizeAuctionListing(auction()), { marketKey: "FIXTURE", coins: 123 });
  assert.equal(await normalizeAuctionListing(auction({ bin: false })), null);
  assert.equal(await normalizeAuctionListing(auction({ end: 1 }), 2), null);
  await assert.rejects(normalizeAuctionListing(auction({ item_bytes: "invalid" })), /recognizable item ID/);
});

test("snapshot sync validates page consistency before publishing one compact snapshot", async () => {
  const pages: AuctionPage[] = [
    { success: true, page: 0, totalPages: 2, totalAuctions: 2, lastUpdated: 1000, auctions: [auction({ uuid: "a", starting_bid: 100, end: 3000 })] },
    { success: true, page: 1, totalPages: 2, totalAuctions: 2, lastUpdated: 1000, auctions: [auction({ uuid: "b", starting_bid: 200, end: 3000 })] },
  ];
  let saved;
  const result = await syncAuctionSnapshot({ fetchPage: async page => pages[page], save: async snapshot => { saved = snapshot; }, now: () => 2000 });
  assert.equal(result.pagesFetched, 2); assert.equal(result.quoteCount, 1); assert.equal(saved!.quotes.FIXTURE.coins, 200);
  const changed = [...pages]; changed[1] = { ...changed[1], lastUpdated: 1001 };
  await assert.rejects(syncAuctionSnapshot({ fetchPage: async page => changed[page], save: async () => {}, now: () => 2000 }), AuctionSnapshotChangedError);
});

test("file snapshot store round-trips validated JSON and reports missing snapshots", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "skyblock-market-")), file = path.join(directory, "latest.json");
  try {
    assert.equal(await loadMarketSnapshot(file), null);
    const snapshot = { version: 1 as const, snapshotId: "fixture", hypixelLastUpdated: 1000, observedAt, completedAt: observedAt,
      pagesFetched: 1, auctionsObserved: 1, binListingsAccepted: 1, quotes: aggregateMarketListings([{ marketKey: "ITEM", coins: 5 }], observedAt) };
    await saveMarketSnapshot(snapshot, file); assert.deepEqual(await loadMarketSnapshot(file), snapshot);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
