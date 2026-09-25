import type { CandidateItem } from "../../schemas/catalog";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { miningRelevantStats } from "../reference/mining-knowledge";
import { prepareCandidate } from "./common";

const fishingStats = ["fishingSpeed", "seaCreatureChance"] as const;
const unavailableWardrobeBaselineWarning = "Wardrobe data is unavailable, so the owned armor baseline for this slot is unknown.";

export function buildActivityDomainLanes(input: {
  domain: "FISHING" | "MINING";
  profile: NormalizedSkyBlockProfile;
  catalog: readonly CandidateItem[];
  quotes: ReadonlyMap<string, MarketQuote>;
  budgetCoins?: number;
}): Record<string, AdvisorCandidate[]> {
  const stats = input.domain === "MINING" ? miningRelevantStats(input.profile) : [...fishingStats];
  const owned = new Set(input.profile.inventoryItems.flatMap(item => item.id ? [item.id] : []));
  const eligible = input.catalog.filter(item => withinBoundary(input.domain, item));
  const wardrobeUnavailable = input.profile.warnings.some(warning => warning.code === "API_DATA_DISABLED" && warning.scope === "wardrobe");
  return Object.fromEntries(stats.map(stat => {
    const candidates = eligible.flatMap(item => {
      const family = itemFamily(item.categories), armorBaselineUnknown = wardrobeUnavailable && isArmorFamily(family);
      const visibleBaseline = Math.max(0, ...input.profile.inventoryItems.filter(ownedItem => itemFamily(ownedItem.categories) === family)
        .map(ownedItem => ownedItem.stats[stat] ?? 0));
      const baseline = armorBaselineUnknown ? null : visibleBaseline;
      return item.stats[stat] !== undefined && (baseline === null || item.stats[stat] > baseline) ? [{ item, baseline, armorBaselineUnknown }] : [];
    })
      .sort((left, right) => (right.item.stats[stat] ?? 0) - (left.item.stats[stat] ?? 0) || left.item.id.localeCompare(right.item.id))
      .flatMap(({ item, baseline, armorBaselineUnknown }) => {
        const candidate = prepareCandidate(domainFor(item), item, input.profile, input.quotes,
          { budgetCoins: input.budgetCoins, ownedItemIds: owned, eligibilityMode: "ADVISOR_DISCOVERY" });
        if (!candidate) return [];
        const warnings = [...candidate.warnings, `${input.domain === "MINING" ? "Mining" : "Fishing"} stat comparisons use the best visible same-slot/tool-family item contribution, not the player's total stat.`];
        if (armorBaselineUnknown) warnings.push(unavailableWardrobeBaselineWarning);
        return [{ ...candidate, knownChanges: { [stat]: { current: baseline, candidate: item.stats[stat] } }, warnings }];
      }).slice(0, 12);
    return [stat, candidates];
  }));
}

function withinBoundary(domain: "FISHING" | "MINING", item: CandidateItem) {
  const stats = domain === "MINING" ? ["miningSpeed", "miningFortune", "gemstoneFortune", "pristine", "coldResistance"] : fishingStats;
  if (domain === "FISHING" && item.categories.includes("fishing_rod")) return true;
  if (domain === "MINING" && item.categories.some(category => category === "pickaxe" || category === "drill")) return true;
  return item.categories.some(category => ["armor", "helmet", "chestplate", "leggings", "boots", "equipment", "tool"].includes(category))
    && stats.some(stat => item.stats[stat] !== undefined);
}

function domainFor(item: CandidateItem): AdvisorCandidate["domain"] {
  return item.categories.some(category => ["armor", "helmet", "chestplate", "leggings", "boots", "equipment"].includes(category)) ? "armor" : "tool";
}

function isArmorFamily(family: string) { return ["helmet", "chestplate", "leggings", "boots"].includes(family); }

function itemFamily(categories: readonly string[]) {
  if (categories.includes("fishing_rod")) return "fishing_rod";
  if (categories.includes("pickaxe") || categories.includes("drill")) return "mining_tool";
  return ["helmet", "chestplate", "leggings", "boots"].find(category => categories.includes(category))
    ?? (categories.includes("equipment") ? "equipment" : "other");
}
