import { rarities, type ProcessedItem, type ProfileWarning } from "../../../schemas/items";
import type { AccessoryReference, AccessorySummary } from "../../../schemas/normalized-profile";
import type { RawMember } from "../../hypixel/types";
import { accessoryBaseId, accessoryChains, mpByRarity } from "../../reference/accessory-data";
import { toProfileItem } from "../items/process-item";

export function buildAccessories(items: ProcessedItem[], member: RawMember, catalog: AccessoryReference[], warnings: ProfileWarning[]): AccessorySummary {
  const owned = items.filter(item => item.categories.includes("accessory") &&
    (["talisman_bag", "inventory", "enderchest"].includes(item.source) || item.source.startsWith("backpack:"))
  ).map(item => ({ ...toProfileItem(item), active: item.source === "talisman_bag", inactiveReason: item.source === "talisman_bag" ? null : "outside_accessory_bag" }));
  const rank = (rarity: typeof rarities[number] | null) => rarity === null ? -1 : rarities.indexOf(rarity);
  const groups = new Map<string, typeof owned>();
  for (const item of owned) {
    // Unknown IDs cannot be declared duplicates of one another.
    if (!item.id) continue;
    const base = accessoryBaseId(item.id);
    groups.set(base, [...(groups.get(base) ?? []), item]);
  }
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => rank(b.rarity) - rank(a.rarity) || Number(b.active) - Number(a.active));
    for (const duplicate of sorted.slice(1)) { duplicate.active = false; duplicate.inactiveReason = "duplicate_or_alias"; }
  }
  const ownedIds = new Set(groups.keys());
  const consumedPrism = member.rift?.access?.consumed_prism === true;
  if (consumedPrism) ownedIds.add("RIFT_PRISM");
  for (const chain of accessoryChains) {
    const highest = chain.findLastIndex(id => ownedIds.has(id));
    for (const id of chain.slice(0, highest)) {
      for (const item of groups.get(id) ?? []) { item.active = false; item.inactiveReason = "higher_upgrade_owned"; }
    }
  }
  const byRarity: AccessorySummary["magicalPower"]["byRarity"] = {};
  let accessories = 0;
  for (const item of owned) {
    if (!item.active) continue;
    // A consumed prism represents the same benefit; do not count a physical copy twice.
    if (item.id === "RIFT_PRISM" && consumedPrism) { item.active = false; item.inactiveReason = "prism_already_consumed"; continue; }
    const base = item.rarity === null ? undefined : mpByRarity[item.rarity];
    if (base === undefined && item.id !== "RIFT_PRISM") {
      warnings.push({ code: "REFERENCE_DATA_MISSING", scope: "accessories", message: `Magical Power unknown for ${item.id ?? item.name}; known contribution only is reported.` });
      continue;
    }
    const mp = item.id === "RIFT_PRISM" ? 11 : base! * (item.id === "HEGEMONY_ARTIFACT" ? 2 : 1);
    accessories += mp;
    const key = item.rarity ?? "unknown", bucket = byRarity[key] ?? { count: 0, mp: 0 };
    bucket.count++; bucket.mp += mp; byRarity[key] = bucket;
  }
  const missing: AccessoryReference[] = [], upgrades: AccessoryReference[] = [];
  for (const reference of catalog) {
    const copies = groups.get(reference.id);
    if (ownedIds.has(reference.id)) {
      if (reference.allowedRarities && copies?.length) {
        const highestBase = Math.max(...copies.map(item => Math.max(-1, rank(item.rarity) - (item.recombobulated && reference.recombobulationAllowed !== false ? 1 : 0))));
        const nextRarity = reference.allowedRarities.find(rarity => rank(rarity) > highestBase);
        if (nextRarity) upgrades.push({ ...reference, rarity: nextRarity });
      }
      continue;
    }
    const chain = accessoryChains.find(chain => chain.includes(reference.id));
    const highestOwned = chain?.findLastIndex(id => ownedIds.has(id)) ?? -1;
    if (chain && highestOwned >= 0) {
      if (chain.indexOf(reference.id) > highestOwned) upgrades.push(reference);
    } else missing.push(reference);
  }
  const riftPrism = consumedPrism ? 11 : 0;
  return { selectedPower: member.accessory_bag_storage?.selected_power ?? null,
    magicalPower: { total: accessories + riftPrism, accessories, riftPrism, byRarity }, owned, missing, upgrades };
}
