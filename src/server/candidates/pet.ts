import type { CandidateItem } from "../../schemas/catalog";
import { petCandidateLanesSchema, type AdvisorCandidate, type PetCandidateLanes, type PetLaneName } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedPet } from "../../schemas/pets";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { dedupeCandidates, prepareCandidate, type CandidateFilterOptions } from "./common";

const tiers = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

function petParts(item: CandidateItem) {
  const match = item.id.match(/^(.+);([0-5])$/);
  return match ? { type: match[1], tier: Number(match[2]) } : null;
}

function petItem(catalog: readonly CandidateItem[], pet: NormalizedPet) {
  const tier = tiers.indexOf(pet.rarity.toLowerCase() as typeof tiers[number]);
  return tier < 0 ? undefined : catalog.find(item => item.id === `${pet.type};${tier}`);
}

export function buildPetLanes(input: {
  profile: NormalizedSkyBlockProfile;
  catalog: readonly CandidateItem[];
  quotes?: ReadonlyMap<string, MarketQuote>;
  budgetCoins?: number;
  eligibilityMode?: CandidateFilterOptions["eligibilityMode"];
  rolePetTypes?: readonly string[];
  laneCap?: number;
  totalCap?: number;
}): PetCandidateLanes {
  const catalog = input.catalog.filter(item => item.categories.includes("pet") && petParts(item));
  const quotes = input.quotes ?? new Map<string, MarketQuote>();
  const laneCap = Math.min(input.laneCap ?? 6, 6), totalCap = Math.min(input.totalCap ?? 20, 20);
  const prepared = (item: CandidateItem) => prepareCandidate("pet", item, input.profile, quotes, { budgetCoins: input.budgetCoins, eligibilityMode: input.eligibilityMode });
  const bestOwned = selectBestOwnedPets(input.profile.pets.owned);
  const owned = input.profile.pets.owned.flatMap(pet => {
    const item = petItem(catalog, pet), candidate = item && prepared(item);
    return candidate ? [{ ...candidate, knownChanges: { level: { current: pet.level, candidate: pet.level } } }] : [];
  }).sort((a, b) => Number(b.item.rarity && tiers.indexOf(b.item.rarity as typeof tiers[number])) - Number(a.item.rarity && tiers.indexOf(a.item.rarity as typeof tiers[number])) || a.id.localeCompare(b.id));
  const levelTargets = bestOwned.flatMap(pet => {
    if (pet.level === null || pet.maxLevel === null || pet.level >= pet.maxLevel) return [];
    const item = petItem(catalog, pet), candidate = item && prepared(item);
    return candidate ? [{ ...candidate, knownChanges: { level: { current: pet.level, candidate: pet.maxLevel } },
      warnings: [...candidate.warnings, "This is a leveling target for an owned pet; leveling cost is not priced."] }] : [];
  }).sort((a, b) => ((b.knownChanges?.level?.candidate ?? 0) - (b.knownChanges?.level?.current ?? 0)) -
    ((a.knownChanges?.level?.candidate ?? 0) - (a.knownChanges?.level?.current ?? 0)) || a.id.localeCompare(b.id));
  const upgrades = bestOwned.flatMap(pet => {
    const currentTier = tiers.indexOf(pet.rarity.toLowerCase() as typeof tiers[number]);
    if (currentTier < 0 || currentTier === tiers.length - 1) return [];
    const item = catalog.find(value => value.id === `${pet.type};${currentTier + 1}`), candidate = item && prepared(item);
    return candidate ? [{ ...candidate, knownChanges: { rarityTier: { current: currentTier, candidate: currentTier + 1 } } }] : [];
  }).sort(priceSort);
  const ownedTypes = new Set(input.profile.pets.owned.map(pet => pet.type));
  const roleProgression = [...new Set(input.rolePetTypes ?? [])].filter(type => !ownedTypes.has(type)).flatMap(type => {
    const choices = catalog.filter(item => petParts(item)?.type === type).map(item => prepared(item)).filter((value): value is AdvisorCandidate => value !== null);
    choices.sort(priceSort); return choices.slice(0, 1);
  });
  const lanes: Record<PetLaneName, AdvisorCandidate[]> = {
    owned: owned.slice(0, laneCap), levelTarget: levelTargets.slice(0, laneCap), rarityUpgrade: upgrades.slice(0, laneCap), roleProgression: roleProgression.slice(0, laneCap),
  };
  return petCandidateLanesSchema.parse({ lanes, candidates: dedupeCandidates(lanes, totalCap) });
}

export function selectBestOwnedPets(pets: readonly NormalizedPet[]): NormalizedPet[] {
  const best = new Map<string, NormalizedPet>();
  for (const pet of pets) {
    const current = best.get(pet.type);
    if (!current || compareOwnedPets(pet, current) < 0) best.set(pet.type, pet);
  }
  return [...best.values()];
}

function compareOwnedPets(left: NormalizedPet, right: NormalizedPet) {
  const leftRarity = tiers.indexOf(left.rarity.toLowerCase() as typeof tiers[number]);
  const rightRarity = tiers.indexOf(right.rarity.toLowerCase() as typeof tiers[number]);
  return rightRarity - leftRarity || (right.level ?? -1) - (left.level ?? -1);
}

function priceSort(left: AdvisorCandidate, right: AdvisorCandidate) {
  if (left.price && right.price) return left.price.coins - right.price.coins || left.id.localeCompare(right.id);
  if (left.price) return -1;
  if (right.price) return 1;
  return left.id.localeCompare(right.id);
}
