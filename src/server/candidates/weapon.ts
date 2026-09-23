import type { CandidateItem } from "../../schemas/catalog";
import { weaponCandidateLanesSchema, weaponLaneNames, type AdvisorCandidate, type WeaponCandidateLanes, type WeaponLaneName } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import type { ProfileItem } from "../../schemas/items";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { collectOwnedItemIds } from "./armor";
import { dedupeCandidates, prepareCandidate, type CandidateFilterOptions } from "./common";

const weaponTypes = ["sword", "bow", "wand", "fishing_rod"] as const;
type WeaponType = typeof weaponTypes[number];
const statLanes = weaponLaneNames.filter((lane): lane is Exclude<WeaponLaneName, "ability"> => lane !== "ability");

function weaponType(item: Pick<ProfileItem | CandidateItem, "categories">): WeaponType | null {
  return weaponTypes.find(type => item.categories.includes(type)) ?? null;
}

export function buildWeaponLanes(input: {
  current: ProfileItem;
  catalog: readonly CandidateItem[];
  profile: NormalizedSkyBlockProfile;
  quotes?: ReadonlyMap<string, MarketQuote>;
  budgetCoins?: number;
  laneCap?: number;
  totalCap?: number;
}): WeaponCandidateLanes {
  if (!input.current.categories.includes("weapon")) throw new Error(`Current item ${input.current.id ?? input.current.name} is not a weapon.`);
  const currentType = weaponType(input.current), quotes = input.quotes ?? new Map<string, MarketQuote>();
  const options: CandidateFilterOptions = { budgetCoins: input.budgetCoins, ownedItemIds: collectOwnedItemIds(input.profile) };
  const prepared = input.catalog
    .filter(item => item.categories.includes("weapon") && (currentType === null || weaponType(item) === currentType))
    .map(item => prepareCandidate("weapon", item, input.profile, quotes, options))
    .filter((candidate): candidate is AdvisorCandidate => candidate !== null);
  const laneCap = Math.min(input.laneCap ?? 6, 6), totalCap = Math.min(input.totalCap ?? 20, 20);
  const lanes = Object.fromEntries([
    ...statLanes.map(stat => [stat, rankStatLane(prepared, input.current, stat, laneCap)] as const),
    ["ability", rankAbilityLane(prepared, input.current, laneCap)] as const,
  ]) as Record<WeaponLaneName, AdvisorCandidate[]>;
  return weaponCandidateLanesSchema.parse({ weaponType: currentType, lanes, candidates: dedupeCandidates(lanes, totalCap) });
}

function rankStatLane(candidates: readonly AdvisorCandidate[], current: ProfileItem, stat: Exclude<WeaponLaneName, "ability">, cap: number) {
  const currentValue = current.stats[stat] ?? null;
  return candidates
    .filter(candidate => candidate.item.stats[stat] !== undefined && (currentValue === null || candidate.item.stats[stat] > currentValue))
    .sort((a, b) => (b.item.stats[stat] ?? 0) - (a.item.stats[stat] ?? 0) || a.id.localeCompare(b.id))
    .slice(0, cap)
    .map(candidate => ({ ...candidate, knownChanges: { [stat]: { current: currentValue, candidate: candidate.item.stats[stat] } } }));
}

function rankAbilityLane(candidates: readonly AdvisorCandidate[], current: ProfileItem, cap: number) {
  const comparisonStats = ["abilityDamage", "intelligence", "damage", "strength"] as const;
  const score = (candidate: AdvisorCandidate) => comparisonStats.map(stat => candidate.item.stats[stat] ?? 0);
  return candidates
    .filter(candidate => candidate.abilityText.length > 0)
    .sort((a, b) => {
      const left = score(a), right = score(b);
      for (let index = 0; index < left.length; index++) if (right[index] !== left[index]) return right[index] - left[index];
      return a.id.localeCompare(b.id);
    })
    .slice(0, cap)
    .map(candidate => ({ ...candidate, knownChanges: Object.fromEntries(comparisonStats
      .filter(stat => candidate.item.stats[stat] !== undefined || current.stats[stat] !== undefined)
      .map(stat => [stat, { current: current.stats[stat] ?? null, candidate: candidate.item.stats[stat] ?? null }])) }));
}
