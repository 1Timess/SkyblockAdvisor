import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const numeric = (value: unknown): Record<string, number> => Object.fromEntries(Object.entries(record(value))
  .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])));
const relevant = /^pest_[a-z_]+(?:_\d+)?$/i;
const farmingId = /^(?:FARM_SUIT_|FARM_ARMOR_|FARMER_BOOTS|MELON_(?:HELMET|CHESTPLATE|LEGGINGS|BOOTS|DICER)|CROPIE_|SQUASH_|FERMENTO_|THEORETICAL_HOE_|ADVANCED_GARDENING_HOE|PUMPKIN_DICER|CACTUS_KNIFE|COCO_CHOPPER|FUNGI_CUTTER|NETHER_WART_HOE|WHEAT_HOE|PEST_VACUUM|SKYMART_VACUUM|INFINI_VACUUM|FARMING_TALISMAN|FARMER_ORB)/i;

/** Captures observed contest field shapes and visible gear, without raw NBT or full contest history. */
export function inspectFarmingMechanics(profile: NormalizedSkyBlockProfile) {
  const jacob = record(profile.otherProgression.jacobsContest), contests = record(jacob.contests);
  const contestSample = Object.entries(contests).slice(0, 3).map(([key, raw]) => ({ crop: key.split(":").at(-1) ?? null,
    fields: Object.keys(record(raw)).sort(), primitiveTypes: Object.fromEntries(Object.entries(record(raw))
      .filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value))
      .map(([field, value]) => [field, value === null ? "null" : typeof value])) }));
  const observed = profile.inventoryItems.filter(item => farmingId.test(item.id ?? "") ||
    (item.stats.farmingFortune ?? 0) > 0 && !item.categories.includes("pet"));
  const pestStats = Object.fromEntries(Object.entries(profile.playerStats.kills).filter(([key]) => relevant.test(key)));
  const pestDeaths = Object.fromEntries(Object.entries(profile.playerStats.deaths).filter(([key]) => relevant.test(key)));
  const pestBestiary = Object.fromEntries(Object.entries(profile.bestiary.kills).filter(([key]) => relevant.test(key)));
  return {
    contests: { count: Object.keys(contests).length, sampleShapes: contestSample, medalInventory: numeric(jacob.medals_inv),
      perkLevels: numeric(jacob.perks), personalBestKeys: Object.keys(record(jacob.personal_bests)).sort(),
      uniqueBracketKeys: Object.keys(record(jacob.unique_brackets)).sort() },
    pestHistory: { killStats: pestStats, deathStats: pestDeaths, bestiaryKills: pestBestiary,
      note: "Historical counts are not active Garden pests or proof of captured pest rewards." },
    visibleGear: { totalMatches: observed.length, items: observed.slice(0, 24).map(item => ({ id: item.id, name: item.name,
      categories: item.categories, source: item.source, reforge: item.reforge, enchantments: item.enchantments, stats: item.stats })) },
    inventoryWarnings: profile.warnings.filter(warning => warning.code === "API_DATA_DISABLED" || warning.code === "INVENTORY_DECODE_FAILED")
      .map(warning => ({ code: warning.code, scope: warning.scope ?? null })),
  };
}
