import type { CandidateItem } from "../../schemas/catalog";
import { armorCandidateLanesSchema, armorLaneNames, type AdvisorCandidate, type ArmorCandidateLanes, type ArmorLaneName } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import type { ProfileItem } from "../../schemas/items";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { buildAdvisorDiscovery, dedupeCandidates, prepareCandidate, type AdvisorCandidateDiscovery, type CandidateFilterOptions } from "./common";

const armorSlots = ["helmet", "chestplate", "leggings", "boots"] as const;
type ArmorSlot = typeof armorSlots[number];

function armorSlot(item: Pick<ProfileItem | CandidateItem, "categories">): ArmorSlot | null {
  return armorSlots.find(slot => item.categories.includes(slot)) ?? null;
}

export function collectOwnedItemIds(profile: NormalizedSkyBlockProfile): ReadonlySet<string> {
  const items = [
    ...profile.gear.armor.items,
    ...profile.gear.equipment.items,
    ...profile.gear.weapons,
    ...profile.accessories.owned,
  ];
  return new Set(items.flatMap(item => item.id ? [item.id] : []));
}

export function buildArmorLanes(input: {
  current: ProfileItem;
  catalog: readonly CandidateItem[];
  profile: NormalizedSkyBlockProfile;
  quotes?: ReadonlyMap<string, MarketQuote>;
  budgetCoins?: number;
  eligibilityMode?: CandidateFilterOptions["eligibilityMode"];
  laneCap?: number;
  totalCap?: number;
}): ArmorCandidateLanes & { discovery: AdvisorCandidateDiscovery<ArmorLaneName> } {
  const slot = armorSlot(input.current);
  if (!slot) throw new Error(`Current item ${input.current.id ?? input.current.name} does not have a recognized armor slot.`);
  const quotes = input.quotes ?? new Map<string, MarketQuote>();
  const options: CandidateFilterOptions = { budgetCoins: input.budgetCoins, ownedItemIds: collectOwnedItemIds(input.profile), eligibilityMode: input.eligibilityMode };
  const prepared = input.catalog
    .filter(item => item.categories.includes("armor") && armorSlot(item) === slot)
    .map(item => prepareCandidate("armor", item, input.profile, quotes, options))
    .filter((candidate): candidate is AdvisorCandidate => candidate !== null);
  const laneCap = Math.min(input.laneCap ?? 6, 6), totalCap = Math.min(input.totalCap ?? 20, 20);
  const lanes = Object.fromEntries(armorLaneNames.map(stat => [stat, rankLane(prepared, input.current, stat, laneCap)])) as Record<ArmorLaneName, AdvisorCandidate[]>;
  const discoveryLanes = Object.fromEntries(armorLaneNames.map(stat => [stat, rankLane(prepared, input.current, stat)])) as Record<ArmorLaneName, AdvisorCandidate[]>;
  const capped = armorCandidateLanesSchema.parse({ slot, lanes, candidates: dedupeCandidates(lanes, totalCap) });
  return { ...capped, discovery: buildAdvisorDiscovery(discoveryLanes, input.current.id ?? input.current.name) };
}

function rankLane(candidates: readonly AdvisorCandidate[], current: ProfileItem, stat: ArmorLaneName, cap?: number) {
  const currentValue = current.stats[stat] ?? null;
  const ranked = candidates
    .filter(candidate => candidate.item.stats[stat] !== undefined && (currentValue === null || candidate.item.stats[stat] > currentValue))
    .sort((a, b) => (b.item.stats[stat] ?? 0) - (a.item.stats[stat] ?? 0) || a.id.localeCompare(b.id))
    .map(candidate => ({ ...candidate, knownChanges: { [stat]: { current: currentValue, candidate: candidate.item.stats[stat] } } }));
  return cap === undefined ? ranked : ranked.slice(0, cap);
}
