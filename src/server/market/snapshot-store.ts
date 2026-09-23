import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { marketSnapshotSchema, type MarketSnapshot } from "../../schemas/market";

export function marketSnapshotPath() {
  return process.env.MARKET_SNAPSHOT_PATH?.trim() || path.join(process.cwd(), "data", "market", "latest.json");
}
export async function loadMarketSnapshot(filePath = marketSnapshotPath()): Promise<MarketSnapshot | null> {
  try { return marketSnapshotSchema.parse(JSON.parse(await fs.readFile(filePath, "utf8"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
export async function saveMarketSnapshot(snapshot: MarketSnapshot, filePath = marketSnapshotPath()) {
  const validated = marketSnapshotSchema.parse(snapshot), directory = path.dirname(filePath), temp = `${filePath}.${process.pid}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temp, JSON.stringify(validated, null, 2), "utf8");
  try { await fs.rename(temp, filePath); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST" && (error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    await fs.rm(filePath, { force: true }); await fs.rename(temp, filePath);
  }
}
