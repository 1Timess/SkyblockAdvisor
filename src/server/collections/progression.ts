import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import type { HypixelItemDefinition } from "../hypixel/types";

export interface CollectionTier { tier: number; amount: number; unlocks: string[] }
export interface CollectionDefinition { id: string; name: string; category: string; tiers: CollectionTier[] }
export interface CollectionProgress {
  id: string; name: string; category: string; collected: number | null;
  unlockedTier: number | null; countTier: number | null; nextTier: CollectionTier | null; remaining: number | null;
  nextTierStatus: "BELOW_THRESHOLD" | "UNKNOWN" | "MAXED";
  craftedMinionTiers: number[];
}
export interface CraftedMinion { id: string; name: string; tiers: number[] }
export interface MinionRecipeLead {
  name: string; generatorId: string | null; collectionId: string; collectionName: string; category: string;
  requiredTier: number; requiredAmount: number; collected: number | null; remaining: number | null;
  access: "EXPLICIT_TIER" | "COUNT_THRESHOLD" | "BELOW_THRESHOLD" | "UNKNOWN";
  history: "OBSERVED" | "NOT_OBSERVED" | "CATALOG_UNKNOWN"; observedCraftedTiers: number[];
  nextCraftTier: number | null; nextCraftItemId: string | null;
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown> : {};
const integer = (value: unknown): number | null => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const title = (id: string) => id.toLowerCase().split("_").map(word => word ? word[0].toUpperCase() + word.slice(1) : "").join(" ");

// Hypixel resources contain categories -> items -> tiers. Unknown or malformed tiers do not become inferred gates.
export function parseCollectionDefinitions(resource: { collections: Record<string, unknown> }): CollectionDefinition[] {
  const definitions: CollectionDefinition[] = [];
  for (const [category, rawCategory] of Object.entries(resource.collections)) {
    for (const [id, rawItem] of Object.entries(record(record(rawCategory).items))) {
      const item = record(rawItem), rawTiers = Array.isArray(item.tiers) ? item.tiers : [];
      const tiers: CollectionTier[] = rawTiers.flatMap(raw => {
        const tier = record(raw), number = integer(tier.tier), amount = integer(tier.amountRequired ?? tier.amount);
        if (number === null || number < 1 || amount === null) return [];
        return [{ tier: number, amount, unlocks: Array.isArray(tier.unlocks) ? tier.unlocks.filter((value): value is string => typeof value === "string") : [] }];
      }).sort((a, b) => a.tier - b.tier);
      if (tiers.length) definitions.push({ id, name: typeof item.name === "string" ? item.name : title(id), category,
        tiers: [...new Map(tiers.map(tier => [tier.tier, tier])).values()] });
    }
  }
  return definitions.sort((a, b) => a.id.localeCompare(b.id));
}

export function buildCollectionProgress(profile: Pick<NormalizedSkyBlockProfile, "collections" | "unlockedCollectionTiers" | "craftedGenerators">,
  definitions: readonly CollectionDefinition[]): CollectionProgress[] {
  const unlocked = new Set(profile.unlockedCollectionTiers.map(id => id.toUpperCase()));
  const crafted = new Map(buildCraftedMinions(profile.craftedGenerators).map(minion => [minion.id, minion.tiers]));
  return definitions.map(definition => {
    const collected = integer(profile.collections[definition.id]) ?? null;
    const confirmed = definition.tiers.filter(tier => unlocked.has(`${definition.id.toUpperCase()}_${tier.tier}`));
    const unlockedTier = confirmed.length ? Math.max(...confirmed.map(tier => tier.tier)) : null;
    const reached = collected === null ? [] : definition.tiers.filter(tier => collected >= tier.amount);
    const countTier = collected === null ? null : reached.length ? Math.max(...reached.map(tier => tier.tier)) : 0;
    // Collection counts can advance farther than the explicit tier list (and co-op tier data may advance farther
    // than this member's count). Use either signal to find the next threshold, but keep their evidence separate.
    const nextTier = definition.tiers.find(tier => tier.tier > Math.max(unlockedTier ?? 0, countTier ?? 0)) ?? null;
    const remaining = nextTier && collected !== null ? Math.max(0, nextTier.amount - collected) : null;
    return { id: definition.id, name: definition.name, category: definition.category, collected, unlockedTier, countTier, nextTier, remaining,
      nextTierStatus: !nextTier ? "MAXED" : collected === null ? "UNKNOWN" : "BELOW_THRESHOLD",
      craftedMinionTiers: crafted.get(definition.id.toUpperCase()) ?? [] };
  });
}

export function buildCraftedMinions(ids: readonly string[]): CraftedMinion[] {
  const crafted = new Map<string, Set<number>>();
  for (const rawId of ids) {
    const match = /^(.+)_(\d+)$/.exec(rawId.toUpperCase());
    if (!match) continue;
    const tier = Number(match[2]);
    if (!Number.isSafeInteger(tier) || tier < 1) continue;
    const tiers = crafted.get(match[1]) ?? new Set<number>();
    tiers.add(tier); crafted.set(match[1], tiers);
  }
  return [...crafted].map(([id, tiers]) => ({ id, name: title(id), tiers: [...tiers].sort((a, b) => a - b) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function selectCraftedMinions(minions: readonly CraftedMinion[], question: string, limit = 8): CraftedMinion[] {
  const text = question.toLowerCase();
  const named = minions.filter(minion => text.includes(minion.name.toLowerCase()) || text.includes(minion.id.toLowerCase().replaceAll("_", " ")));
  if (named.length) return named.slice(0, limit);
  // Surface the smallest observed tier histories first. These are investigation leads, not proofs of missing crafts.
  return [...minions].sort((a, b) => Math.max(...a.tiers) - Math.max(...b.tiers) || a.id.localeCompare(b.id)).slice(0, limit);
}

export function buildMinionRecipeLeads(definitions: readonly CollectionDefinition[], progress: readonly CollectionProgress[],
  craftedMinions: readonly CraftedMinion[], items: readonly HypixelItemDefinition[]): MinionRecipeLead[] {
  const progressById = new Map(progress.map(entry => [entry.id, entry]));
  const craftedById = new Map(craftedMinions.map(minion => [minion.id, minion]));
  const generatorItems = items.filter(item => item.generator && item.generator_tier);
  return definitions.flatMap(definition => definition.tiers.flatMap(tier => tier.unlocks.flatMap(unlock => {
    const match = /^(.+?) Minion Recipes$/i.exec(unlock);
    if (!match) return [];
    const entry = progressById.get(definition.id);
    if (!entry) return [];
    const variants = generatorItems.filter(item => /^(.+) Minion [IVX]+$/.exec(item.name)?.[1] === match[1]);
    const ids = new Set(variants.map(item => item.generator));
    const generatorId = ids.size === 1 ? variants[0].generator! : null;
    const observed = generatorId ? craftedById.get(generatorId)?.tiers ?? [] : [];
    const nextItem = generatorId ? variants.filter(item => item.generator === generatorId && item.generator_tier! > (observed.at(-1) ?? 0))
      .sort((a, b) => a.generator_tier! - b.generator_tier!)[0] : undefined;
    const access = (entry.unlockedTier ?? 0) >= tier.tier ? "EXPLICIT_TIER" as const
      : (entry.countTier ?? 0) >= tier.tier ? "COUNT_THRESHOLD" as const
        : entry.collected === null ? "UNKNOWN" as const : "BELOW_THRESHOLD" as const;
    return [{ name: match[1], generatorId, collectionId: definition.id, collectionName: definition.name, category: definition.category,
      requiredTier: tier.tier, requiredAmount: tier.amount, collected: entry.collected,
      remaining: entry.collected === null ? null : Math.max(0, tier.amount - entry.collected), access,
      history: generatorId === null ? "CATALOG_UNKNOWN" as const : observed.length ? "OBSERVED" as const : "NOT_OBSERVED" as const,
      observedCraftedTiers: observed, nextCraftTier: nextItem?.generator_tier ?? null, nextCraftItemId: nextItem?.id ?? null }];
  })));
}

export function selectMinionRecipeLeads(leads: readonly MinionRecipeLead[], question: string, limit = 8): MinionRecipeLead[] {
  const text = question.toLowerCase();
  const named = leads.filter(lead => text.includes(lead.name.toLowerCase()) || text.includes(lead.collectionName.toLowerCase()));
  if (named.length) return named.slice(0, limit);
  const accessRank = { EXPLICIT_TIER: 0, COUNT_THRESHOLD: 1, BELOW_THRESHOLD: 4, UNKNOWN: 6 };
  return [...leads].sort((a, b) => {
    const aObserved = a.history === "NOT_OBSERVED" ? 0 : a.history === "OBSERVED" ? 2 : 7;
    const bObserved = b.history === "NOT_OBSERVED" ? 0 : b.history === "OBSERVED" ? 2 : 7;
    return accessRank[a.access] + aObserved + (a.nextCraftTier === null ? 10 : 0)
      - accessRank[b.access] - bObserved - (b.nextCraftTier === null ? 10 : 0)
      || (a.remaining ?? Infinity) - (b.remaining ?? Infinity) || a.name.localeCompare(b.name);
  }).slice(0, limit);
}

export function selectCollectionFocus(progress: readonly CollectionProgress[], question: string, limit = 8): CollectionProgress[] {
  const text = question.toLowerCase();
  const named = progress.filter(entry => text.includes(entry.name.toLowerCase()) || text.includes(entry.id.toLowerCase().replaceAll("_", " ")));
  if (named.length) return named.slice(0, limit);
  return [...progress].filter(entry => entry.nextTier !== null)
    .sort((a, b) => {
      const aKnown = a.remaining !== null ? 1 : 0, bKnown = b.remaining !== null ? 1 : 0;
      if (aKnown !== bKnown) return bKnown - aKnown;
      const aRatio = a.nextTier && a.collected !== null ? a.collected / a.nextTier.amount : -1;
      const bRatio = b.nextTier && b.collected !== null ? b.collected / b.nextTier.amount : -1;
      return bRatio - aRatio || a.id.localeCompare(b.id);
    }).slice(0, limit);
}
