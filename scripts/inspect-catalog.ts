import { hypixelClient } from "../src/server/hypixel/client";
import { buildItemCatalog } from "../src/server/reference/item-catalog";
import { loadNeuRepository } from "../src/server/reference/neu/repository";

async function main() {
  const ids = process.argv.slice(2);
  let neu;
  try { neu = await loadNeuRepository(); }
  catch (error) { console.warn(`NEU snapshot unavailable: ${error instanceof Error ? error.message : String(error)}`); }
  const catalog = buildItemCatalog(await hypixelClient.getItems(), neu);
  const selected = ids.length ? ids.map(id => catalog.getById(id)).filter(item => item !== undefined) : catalog.getAll().slice(0, 5);
  console.log(JSON.stringify({ diagnostics: catalog.getDiagnostics(), items: selected }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Catalog inspection failed."); process.exitCode = 1; });
