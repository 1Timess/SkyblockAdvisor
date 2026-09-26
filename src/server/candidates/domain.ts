import type { CandidateItem } from "../../schemas/catalog";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { miningRelevantStats } from "../reference/mining-knowledge";
import { prepareCandidate } from "./common";
import { buildMiningGemstoneUpgradeLanes } from "./gemstone";
import { buildMiningDrillComponentUpgradeLanes } from "./drill-components";
import { buildMiningDeployableLanes } from "./deployables";

const fishingStats = ["fishingSpeed", "seaCreatureChance"] as const;
const unavailableArmorLoadoutWarning = "Armor loadout data is unavailable, so the owned armor baseline for this slot is unknown.";
const unavailableEquipmentLoadoutWarning = "Equipment loadout data is unavailable, so the owned equipment baseline for this slot is unknown.";

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
  const armorLoadoutsUnavailable = input.profile.warnings.some(warning => warning.code === "API_DATA_DISABLED" && warning.scope === "loadout.armor");
  const equipmentLoadoutsUnavailable = input.profile.warnings.some(warning => warning.code === "API_DATA_DISABLED" && warning.scope === "loadout.equipment");
  const replacementLanes = Object.fromEntries(stats.map(stat => {
    const candidates = eligible.flatMap(item => {
      const family = itemFamily(item.categories), baselineUnknown = armorLoadoutsUnavailable && isArmorFamily(family)
        || equipmentLoadoutsUnavailable && isEquipmentFamily(family);
      const familyItems = input.profile.inventoryItems.filter(ownedItem => itemFamily(ownedItem.categories) === family);
      const visibleBaseline = Math.max(0, ...familyItems.map(ownedItem => ownedItem.stats[stat] ?? 0));
      const baseline = baselineUnknown ? null : visibleBaseline;
      return item.stats[stat] !== undefined && (baseline === null || item.stats[stat] > baseline) ? [{ item, baselineUnknown, family, familyItems }] : [];
    })
      .sort((left, right) => (right.item.stats[stat] ?? 0) - (left.item.stats[stat] ?? 0) || left.item.id.localeCompare(right.item.id))
      .flatMap(({ item, baselineUnknown, family, familyItems }) => {
        const candidate = prepareCandidate(domainFor(item), item, input.profile, input.quotes,
          { budgetCoins: input.budgetCoins, ownedItemIds: owned, eligibilityMode: "ADVISOR_DISCOVERY" });
        if (!candidate) return [];
        const warnings = [...candidate.warnings, `${input.domain === "MINING" ? "Mining" : "Fishing"} stat comparisons use the best visible same-slot/tool-family item contribution, not the player's total stat.`];
        if (baselineUnknown) warnings.push(isArmorFamily(family) ? unavailableArmorLoadoutWarning : unavailableEquipmentLoadoutWarning);
        return [{ ...candidate, knownChanges: comparisonVector(item, familyItems, stats, baselineUnknown), warnings }];
      }).slice(0, 12);
    return [stat, candidates];
  }));
  if (input.domain !== "MINING") return replacementLanes;
  const gemstoneLanes = buildMiningGemstoneUpgradeLanes(input.profile, input.quotes);
  const componentLanes = buildMiningDrillComponentUpgradeLanes(input);
  const deployableLanes = buildMiningDeployableLanes(input);
  const laneNames = new Set([...stats, ...Object.keys(componentLanes), ...Object.keys(deployableLanes)]);
  return Object.fromEntries([...laneNames].map(stat => [stat, [...(gemstoneLanes[stat] ?? []), ...(componentLanes[stat] ?? []), ...(deployableLanes[stat] ?? []), ...(replacementLanes[stat] ?? [])]]));
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
function isEquipmentFamily(family: string) { return ["necklace", "cloak", "belt", "gloves", "bracelet", "equipment"].includes(family); }

function itemFamily(categories: readonly string[]) {
  if (categories.includes("fishing_rod")) return "fishing_rod";
  if (categories.includes("pickaxe") || categories.includes("drill")) return "mining_tool";
  return ["helmet", "chestplate", "leggings", "boots", "necklace", "cloak", "belt", "gloves", "bracelet"].find(category => categories.includes(category))
    ?? (categories.includes("equipment") ? "equipment" : "other");
}

function comparisonVector(item: CandidateItem, familyItems: readonly NormalizedSkyBlockProfile["inventoryItems"][number][],
  stats: readonly string[], baselineUnknown: boolean): NonNullable<AdvisorCandidate["knownChanges"]> {
  const changes: NonNullable<AdvisorCandidate["knownChanges"]> = {};
  for (const stat of stats) {
    const candidate = item.stats[stat] ?? 0;
    if (baselineUnknown) {
      if (candidate !== 0) changes[stat] = { current: null, candidate };
      continue;
    }
    const current = Math.max(0, ...familyItems.map(ownedItem => ownedItem.stats[stat] ?? 0));
    if (current !== 0 || candidate !== 0) changes[stat] = { current, candidate };
  }
  return changes;
}
