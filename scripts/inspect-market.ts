import { loadMarketSnapshot } from "../src/server/market/snapshot-store";

async function main() {
  const keys = process.argv.slice(2), snapshot = await loadMarketSnapshot();
  if (!snapshot) throw new Error("No local market snapshot. Run npm run sync:auctions first.");
  const quotes = keys.length ? Object.fromEntries(keys.map(key => [key, snapshot.quotes[key] ?? null])) : Object.fromEntries(Object.entries(snapshot.quotes).slice(0, 10));
  console.log(JSON.stringify({ snapshotId: snapshot.snapshotId, observedAt: snapshot.observedAt, pagesFetched: snapshot.pagesFetched,
    auctionsObserved: snapshot.auctionsObserved, binListingsAccepted: snapshot.binListingsAccepted, quoteCount: Object.keys(snapshot.quotes).length, quotes }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Market inspection failed."); process.exitCode = 1; });
