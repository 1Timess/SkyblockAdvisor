import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

export interface CollectionTier { tier: number; amount: number; unlocks: string[] }
export interface CollectionDefinition { id: string; name: string; category: string; tiers: CollectionTier[] }
export interface CollectionProgress {
  id: string; name: string; category: string; collected: number | null;
  unlockedTier: number | null; nextTier: CollectionTier | null; remaining: number | null;
  nextTierStatus: "LOCKED" | "REACHED_UNCONFIRMED" | "UNKNOWN" | "MAXED";
  craftedMinionTiers: number[];
}
export interface CraftedMinion { id: string; name: string; tiers: number[] }

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
    // Use the explicit unlocked-tier signal first. A count alone is not proof of an unlock on this member.
    const nextTier = definition.tiers.find(tier => tier.tier > (unlockedTier ?? 0)) ?? null;
    const remaining = nextTier && collected !== null ? Math.max(0, nextTier.amount - collected) : null;
    return { id: definition.id, name: definition.name, category: definition.category, collected, unlockedTier, nextTier, remaining,
      nextTierStatus: !nextTier ? "MAXED" : collected === null ? "UNKNOWN" : remaining === 0 ? "REACHED_UNCONFIRMED" : "LOCKED",
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
  return (named.length ? named : minions).slice(0, limit);
}

export function selectCollectionFocus(progress: readonly CollectionProgress[], question: string, limit = 8): CollectionProgress[] {
  const text = question.toLowerCase();
  const named = progress.filter(entry => text.includes(entry.name.toLowerCase()) || text.includes(entry.id.toLowerCase().replaceAll("_", " ")));
  if (named.length) return named.slice(0, limit);
  return [...progress].filter(entry => entry.nextTier !== null || entry.craftedMinionTiers.length > 0)
    .sort((a, b) => {
      const aKnown = a.remaining !== null ? 1 : 0, bKnown = b.remaining !== null ? 1 : 0;
      if (aKnown !== bKnown) return bKnown - aKnown;
      const aRatio = a.nextTier && a.collected !== null ? a.collected / a.nextTier.amount : -1;
      const bRatio = b.nextTier && b.collected !== null ? b.collected / b.nextTier.amount : -1;
      return bRatio - aRatio || a.id.localeCompare(b.id);
    }).slice(0, limit);
}
