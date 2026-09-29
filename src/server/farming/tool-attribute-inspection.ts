import type { ProcessedItem } from "../../schemas/items";

const farmingToolId = /^(?:THEORETICAL_HOE_|ADVANCED_GARDENING_HOE|MELON_DICER|PUMPKIN_DICER|CACTUS_KNIFE|COCO_CHOPPER|FUNGI_CUTTER|NETHER_WART_HOE|WHEAT_HOE|SKYMART_VACUUM|INFINI_VACUUM|PEST_VACUUM|ECLIPSE_HOE)/i;
const numeric = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;

/** Only names and numeric values of progression-looking NBT keys; never raw item NBT. */
export function inspectFarmingToolAttributes(items: readonly ProcessedItem[]) {
  const matching = items.filter(item => farmingToolId.test(item.id ?? ""));
  return { totalMatches: matching.length, tools: matching.slice(0, 20).map(item => {
    const entries = Object.entries(item.extraAttributes).filter(([key]) => /farm|crop|exp|level|counter|harvest|cultivat|slot|gem|chip|sowdust|pest/i.test(key));
    return { id: item.id, name: item.name, source: item.source, keys: entries.map(([key]) => key).sort(),
      numericFields: Object.fromEntries(entries.flatMap(([key, value]) => numeric(value) === null ? [] : [[key, numeric(value)!]])),
      nestedKeys: Object.fromEntries(entries.flatMap(([key, value]) => value && typeof value === "object" && !Array.isArray(value)
        ? [[key, Object.keys(value).sort()]] : [])) };
  }) };
}
