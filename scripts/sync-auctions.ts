import { syncAuctionSnapshot } from "../src/server/market/sync";

syncAuctionSnapshot().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
  console.error(error instanceof Error ? error.message : "Auction sync failed."); process.exitCode = 1;
});
