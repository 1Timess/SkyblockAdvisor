import type { RawProfile, HypixelItemDefinition } from "../hypixel/types";
import { buildCraftedMinions } from "../collections/progression";

// Craft-based slot thresholds, excluding Elizabeth's five Community Shop slots.
export const MINION_SLOT_THRESHOLDS = [
  [0,5],[5,6],[15,7],[30,8],[50,9],[75,10],[100,11],[125,12],[150,13],
  [175,14],[200,15],[225,16],[250,17],[275,18],[300,19],[350,20],
  [400,21],[450,22],[500,23],[550,24],[600,25],[650,26],[700,27],
] as const;

function craftedIds(member: unknown): string[] | null {
  if (!member || typeof member !== "object" || Array.isArray(member)) return null;
  const player = (member as Record<string, unknown>).player_data;
  if (!player || typeof player !== "object" || Array.isArray(player)) return null;
  const crafted = (player as Record<string, unknown>).crafted_generators;
  return Array.isArray(crafted) && crafted.every(id => typeof id === "string") ? crafted : null;
}

export function buildMinionProgress(profile: RawProfile, catalog: readonly HypixelItemDefinition[], catalogAvailable = true) {
  const memberHistories = Object.values(profile.members).map(craftedIds);
  const observed = new Set(memberHistories.flatMap(ids => ids ?? []).map(id => id.toUpperCase()));
  const historyComplete = memberHistories.length > 0 && memberHistories.every(ids => ids !== null);
  const available = memberHistories.some(ids => ids !== null);
  const crafted = buildCraftedMinions([...observed]);
  const byGenerator = new Map<string, HypixelItemDefinition[]>();
  for (const item of catalog) {
    if (!item.generator || !item.generator_tier) continue;
    const key = item.generator.toUpperCase();
    byGenerator.set(key,[...(byGenerator.get(key) ?? []),item]);
  }
  const ids = new Set([...crafted.map(m => m.id), ...byGenerator.keys()]);
  const knownById = new Map(crafted.map(m => [m.id,m]));
  const families = [...ids].map(id => {
    const known = knownById.get(id);
    const entries = [...(byGenerator.get(id) ?? [])].sort((a,b) => a.generator_tier! - b.generator_tier!);
    const maxCraftedTier = known?.tiers.at(-1) ?? 0;
    const next = entries.find(i => i.generator_tier! > maxCraftedTier);
    const representative = entries.find(i=>i.generator_tier===1) ?? entries[0];
    const name = representative?.name.replace(/ Minion [IVXLCDM]+$/i,"") ?? known?.name ?? id;
    const maxCatalogTier = entries.at(-1)?.generator_tier ?? null;
    return {id,name,itemId:representative?.id ?? null,craftedTiers:known?.tiers ?? [],
      maxCraftedTier,maxCatalogTier,nextTier:next?.generator_tier ?? null,nextItemId:next?.id ?? null};
  }).sort((a,b)=> (a.maxCraftedTier===0?1:0)-(b.maxCraftedTier===0?1:0) || a.name.localeCompare(b.name));
  // Report the minimum established by observed crafts; unavailable co-op histories can only increase it.
  const uniqueCrafts = observed.size;
  const current = [...MINION_SLOT_THRESHOLDS].reverse().find(([required])=>uniqueCrafts>=required)!;
  const next = MINION_SLOT_THRESHOLDS.find(([required])=>required>uniqueCrafts);
  const upgrades = profile.community_upgrades?.upgrade_states;
  // The maximum completed upgrade tier, not the number of history entries.
  const bonusSlots = upgrades
    ? Math.min(5,Math.max(0,...upgrades.filter(entry=>entry.upgrade==="minion_slots" && entry.claimed_ms != null).map(entry=>entry.tier??0)))
    : null;
  const craftedSlots = current[1];
  return {
    available,historyComplete,uniqueCrafts,craftedSlots,bonusSlots,
    // A missing Community Shop payload means its bonus is unknown, not zero.
    // This total is a lower bound whenever member history or Community Shop data is incomplete.
    totalSlots: craftedSlots + (bonusSlots ?? 0),
    nextSlotAt: next?.[0] ?? null,
    craftsToNextSlot: next ? next[0]-uniqueCrafts : null,
    families,catalogAvailable,
  };
}
