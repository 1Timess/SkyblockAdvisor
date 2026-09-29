import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const numeric = (value: unknown) => Object.fromEntries(Object.entries(record(value)).filter(([, raw]) => typeof raw === "number" && Number.isFinite(raw)));
const relevant = /pest|fly|cricket|locust|field_mouse|mosquito|earthworm|mite|moth|slug|beetle|firefly|dragonfly|mantis/i;
const farmingItem = /farm|crop|hoe|vacuum|melon|pumpkin|cactus|mushroom|wheat|carrot|potato|cane|wart|greenhouse|cultivat|harvest|chopper/i;

/** Captures observed contest field shapes and visible gear, without raw NBT or full contest history. */
export function inspectFarmingMechanics(profile: NormalizedSkyBlockProfile) {
  const jacob = record(profile.otherProgression.jacobsContest), contests = record(jacob.contests);
  const contestSample = Object.entries(contests).slice(0, 3).map(([key, raw]) => ({ crop: key.split(":").at(-1) ?? null,
    fields: Object.keys(record(raw)).sort(), primitiveTypes: Object.fromEntries(Object.entries(record(raw))
      .filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value))
      .map(([field, value]) => [field, value === null ? "null" : typeof value])) }));
  const observed = profile.inventoryItems.filter(item => item.categories.some(category => farmingItem.test(category)) ||
    farmingItem.test(item.id ?? "") || farmingItem.test(item.name));
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
