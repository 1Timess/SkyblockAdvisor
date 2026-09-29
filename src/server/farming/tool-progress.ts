const toolId = /^(?:THEORETICAL_HOE_|ADVANCED_GARDENING_HOE|MELON_DICER|PUMPKIN_DICER|CACTUS_KNIFE|COCO_CHOPPER|FUNGI_CUTTER|NETHER_WART_HOE|WHEAT_HOE|ECLIPSE_HOE)/i;
const finiteNonnegative = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

/** Raw observed levelable fields; no assumed cap or XP threshold. */
export function extractFarmingToolProgress(id: string | null, extra: Record<string, unknown>) {
  if (!id || !toolId.test(id)) return null;
  const rawLevel = finiteNonnegative(extra.levelable_lvl), rawExperience = finiteNonnegative(extra.levelable_exp);
  const dummies = finiteNonnegative(extra.farming_for_dummies_count);
  if (rawLevel === null && rawExperience === null && dummies === null) return null;
  return { rawLevel, rawExperience, farmingForDummiesCount: dummies };
}

/** Crop identity is encoded by these specialized tool IDs; generic hoes have no implied crop. */
export function farmingToolCrop(id: string | null): string | null {
  if (!id) return null;
  const theoretical = /^THEORETICAL_HOE_(WHEAT|CARROT|POTATO|SUGAR_CANE|NETHER_WART|COCOA_BEANS)(?:_|$)/i.exec(id);
  if (theoretical) return theoretical[1].replaceAll("_", " ").toLowerCase();
  const dicer = /^(MELON|PUMPKIN)_DICER(?:_|$)/i.exec(id);
  if (dicer) return dicer[1].toLowerCase();
  const specialized: Record<string, string> = { CACTUS_KNIFE: "cactus", COCO_CHOPPER: "cocoa beans", FUNGI_CUTTER: "mushroom" };
  return Object.entries(specialized).find(([prefix]) => id.toUpperCase().startsWith(prefix))?.[1] ?? null;
}
