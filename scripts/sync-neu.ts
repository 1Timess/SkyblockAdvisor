import { promises as fs } from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { neuItemSchema, neuMetadataSchema } from "../src/schemas/neu";
import { neuDataDirectory } from "../src/server/reference/neu/paths";

const repository = "NotEnoughUpdates/NotEnoughUpdates-REPO";
const branch = "master";
const archiveUrl = "https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO/archive/refs/heads/master.zip";

async function exists(target: string) { try { await fs.access(target); return true; } catch { return false; } }

async function main() {
  const data = neuDataDirectory(), current = path.join(data, "repository"), metadataPath = path.join(data, "metadata.json");
  const temp = path.join(data, ".temp"), archive = path.join(temp, "repository.zip"), extracted = path.join(temp, "extracted");
  let etag: string | null = null;
  if (await exists(metadataPath)) {
    try { etag = neuMetadataSchema.parse(JSON.parse(await fs.readFile(metadataPath, "utf8"))).etag; } catch { /* replace invalid metadata */ }
  }
  await fs.rm(temp, { recursive: true, force: true }); await fs.mkdir(temp, { recursive: true });
  try {
    const headers = new Headers({ "User-Agent": "SkyBlockAdvisor/0.1" }); if (etag) headers.set("If-None-Match", etag);
    const response = await fetch(archiveUrl, { headers, redirect: "follow" });
    if (response.status === 304) { console.log("NEU snapshot is current."); return; }
    if (!response.ok) throw new Error(`NEU archive request failed: ${response.status} ${response.statusText}`);
    await fs.writeFile(archive, Buffer.from(await response.arrayBuffer()));
    new AdmZip(archive).extractAllTo(extracted, true);
    const roots = (await fs.readdir(extracted, { withFileTypes: true })).filter(entry => entry.isDirectory());
    if (roots.length !== 1) throw new Error("Unexpected NEU archive structure.");
    const root = path.join(extracted, roots[0].name), itemsDirectory = path.join(root, "items");
    const files = (await fs.readdir(itemsDirectory, { withFileTypes: true })).filter(entry => entry.isFile() && entry.name.endsWith(".json"));
    if (!files.length) throw new Error("NEU snapshot contains no item JSON files.");
    for (const file of files) neuItemSchema.parse(JSON.parse(await fs.readFile(path.join(itemsDirectory, file.name), "utf8")));
    const previous = path.join(data, ".previous"); await fs.mkdir(data, { recursive: true }); await fs.rm(previous, { recursive: true, force: true });
    if (await exists(current)) await fs.rename(current, previous);
    try {
      await fs.rename(root, current);
      await fs.writeFile(metadataPath, JSON.stringify({ provider: "neu", repository, branch, etag: response.headers.get("etag"), downloadedAt: new Date().toISOString(), itemCount: files.length }, null, 2));
      await fs.rm(previous, { recursive: true, force: true });
    } catch (error) {
      await fs.rm(current, { recursive: true, force: true }); if (await exists(previous)) await fs.rename(previous, current); throw error;
    }
    console.log(`Published NEU snapshot with ${files.length} items.`);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "NEU sync failed."); process.exitCode = 1; });
