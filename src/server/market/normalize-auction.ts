import type { HypixelAuction } from "../hypixel/auctions";
import type { ProfileWarning } from "../../schemas/items";
import { decodeInventory } from "../skyblock/nbt/decode-inventory";
import { processItem } from "../skyblock/items/process-item";
import { resolveMarketKey } from "./identity";
import type { MarketListing } from "./types";

export async function normalizeAuctionListing(auction: HypixelAuction, now = Date.now()): Promise<MarketListing | null> {
  if (auction.bin !== true || auction.end <= now) return null;
  const warnings: ProfileWarning[] = [];
  const decoded = await decodeInventory({ data: auction.item_bytes }, `auction:${auction.uuid}`, warnings);
  const item = decoded.length ? processItem(decoded[0], "auction", 0, warnings) : null;
  if (!item?.id) throw new Error(`Auction ${auction.uuid} did not contain a recognizable item ID.`);
  const marketKey = resolveMarketKey(item.id, item.extraAttributes);
  return marketKey ? { marketKey, coins: Math.trunc(auction.starting_bid) } : null;
}
