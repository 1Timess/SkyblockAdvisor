import type { CandidateItem } from "../../schemas/catalog";
import { accessoryCandidateLanesSchema, type AccessoryCandidateLanes, type AccessoryLaneName, type AdvisorCandidate } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import { rarities } from "../../schemas/items";
import type { AccessoryReference, NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { accessoryBaseId, accessoryChains, mpByRarity } from "../reference/accessory-data";
import { dedupeCandidates, prepareCandidate, type CandidateFilterOptions } from "./common";

function magicalPower(id: string, rarity: string | null) {
  if (id === "RIFT_PRISM") return 11;
  const base = rarity ? mpByRarity[rarity] : undefined;
  return base === undefined ? null : base * (id === "HEGEMONY_ARTIFACT" ? 2 : 1);
}

function currentPower(reference: AccessoryReference, profile: NormalizedSkyBlockProfile) {
  const chain = accessoryChains.find(value => value.includes(reference.id));
  const ids = new Set(chain ?? [accessoryBaseId(reference.id)]);
  const values = profile.accessories.owned
    .filter(item => item.id && ids.has(accessoryBaseId(item.id)))
    .map(item => magicalPower(item.id!, item.rarity))
    .filter((value): value is number => value !== null);
  return values.length ? Math.max(...values) : 0;
}

function attachPower(candidate: AdvisorCandidate, current: number, target: number) {
  return { ...candidate, knownChanges: { magicalPower: { current, candidate: target } } };
}

function priceSort(left: AdvisorCandidate, right: AdvisorCandidate) {
  if (left.price && right.price) return left.price.coins - right.price.coins || left.id.localeCompare(right.id);
  if (left.price) return -1;
  if (right.price) return 1;
  return left.id.localeCompare(right.id);
}

export function buildAccessoryLanes(input: {
  profile: NormalizedSkyBlockProfile;
  catalog: readonly CandidateItem[];
  references: readonly AccessoryReference[];
  quotes?: ReadonlyMap<string, MarketQuote>;
  budgetCoins?: number;
  eligibilityMode?: CandidateFilterOptions["eligibilityMode"];
  laneCap?: number;
  totalCap?: number;
}): AccessoryCandidateLanes {
  const catalog = new Map(input.catalog.filter(item => item.categories.includes("accessory")).map(item => [item.id, item]));
  const references = new Map(input.references.map(reference => [reference.id, reference]));
  const quotes = input.quotes ?? new Map<string, MarketQuote>();
  const laneCap = Math.min(input.laneCap ?? 6, 6), totalCap = Math.min(input.totalCap ?? 20, 20);
  const fromReferences = (values: readonly AccessoryReference[]) => values.flatMap(reference => {
    const item = catalog.get(reference.id), target = magicalPower(reference.id, reference.rarity);
    if (!item || target === null) return [];
    const prepared = prepareCandidate("accessory", item, input.profile, quotes, { budgetCoins: input.budgetCoins, eligibilityMode: input.eligibilityMode });
    return prepared ? [attachPower(prepared, currentPower(reference, input.profile), target)] : [];
  });
  const missing = fromReferences(input.profile.accessories.missing).sort(priceSort);
  const upgrades = fromReferences(input.profile.accessories.upgrades).sort((a, b) => {
    const gainA = (a.knownChanges?.magicalPower?.candidate ?? 0) - (a.knownChanges?.magicalPower?.current ?? 0);
    const gainB = (b.knownChanges?.magicalPower?.candidate ?? 0) - (b.knownChanges?.magicalPower?.current ?? 0);
    return gainB - gainA || priceSort(a, b);
  });
  const value = [...missing, ...upgrades].filter(candidate => candidate.price && powerGain(candidate) > 0)
    .sort((a, b) => a.price!.coins / powerGain(a) - b.price!.coins / powerGain(b) || a.id.localeCompare(b.id));
  const recombobulation: AdvisorCandidate[] = [], enrichment: AdvisorCandidate[] = [];
  for (const owned of input.profile.accessories.owned.filter(item => item.active && item.id)) {
    const reference = references.get(accessoryBaseId(owned.id!)), item = catalog.get(accessoryBaseId(owned.id!));
    if (!reference || !item) continue;
    const prepared = prepareCandidate("accessory", item, input.profile, new Map(), {});
    if (!prepared) continue;
    if (reference.recombobulationAllowed === true && !owned.recombobulated && owned.rarity) {
      const index = rarities.indexOf(owned.rarity), next = index >= 0 ? rarities[index + 1] : undefined;
      const current = magicalPower(owned.id!, owned.rarity), target = next ? magicalPower(owned.id!, next) : null;
      if (current !== null && target !== null && target > current) recombobulation.push({
        ...attachPower(prepared, current, target),
        warnings: [...prepared.warnings, "This is an owned-item recombobulation opportunity; recombobulator pricing is not included."],
      });
    }
    if (reference.enrichmentAllowed === true) enrichment.push({
      ...prepared,
      warnings: [...prepared.warnings, "This is an owned-item enrichment opportunity; the enrichment effect is not selected here."],
    });
  }
  const lanes: Record<AccessoryLaneName, AdvisorCandidate[]> = {
    missing: missing.slice(0, laneCap), rarityUpgrade: upgrades.slice(0, laneCap), cheapestMp: value.slice(0, laneCap),
    recombobulation: recombobulation.slice(0, laneCap), enrichment: enrichment.slice(0, laneCap),
  };
  return accessoryCandidateLanesSchema.parse({ lanes, candidates: dedupeCandidates(lanes, totalCap) });
}

function powerGain(candidate: AdvisorCandidate) {
  const change = candidate.knownChanges?.magicalPower;
  return change ? (change.candidate ?? 0) - (change.current ?? 0) : 0;
}
