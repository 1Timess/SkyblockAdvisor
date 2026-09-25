import type { ProcessedItem, ProfileItem } from "../../../schemas/items";
import { toProfileItem } from "../items/process-item";

function section(items: ProcessedItem[]) {
  const stats: Record<string, number> = {};
  for (const item of items) for (const [key, value] of Object.entries(item.stats)) stats[key] = (stats[key] ?? 0) + value;
  return { items: items.map(toProfileItem), stats };
}

export function buildGear(items: ProcessedItem[], loadout?: {
  armor?: Record<string, unknown>;
  equipment?: Record<string, unknown>;
  loadouts?: Record<string, unknown>;
}) {
  const order = ["helmet", "chestplate", "leggings", "boots"];
  const armor = items.filter(i => i.source === "armor").sort((a, b) => {
    const rank = (item: ProcessedItem) => { const index = order.findIndex(slot => item.categories.includes(slot)); return index < 0 ? 4 : index; };
    return rank(a) - rank(b) || a.slotIndex - b.slotIndex;
  });
  return {
    armor: section(armor), equipment: section(items.filter(i => i.source === "equipment")),
    weapons: items.filter(i => i.categories.includes("weapon")).map(toProfileItem),
    loadouts: buildLoadoutIndex(items, loadout),
  };
}

function buildLoadoutIndex(items: ProcessedItem[], loadout?: {
  armor?: Record<string, unknown>;
  equipment?: Record<string, unknown>;
  loadouts?: Record<string, unknown>;
}) {
  return {
    names: loadoutNames(loadout?.loadouts),
    armor: { equippedSet: setNumber(loadout?.armor?.equipped_set), sets: loadoutSets(items, "armor") },
    equipment: { equippedSet: setNumber(loadout?.equipment?.equipped_set), sets: loadoutSets(items, "equipment") },
  };
}

function loadoutSets(items: ProcessedItem[], kind: "armor" | "equipment") {
  const sets: Record<string, Record<string, ProfileItem>> = {};
  for (const item of items) {
    const match = item.source.match(new RegExp(`^loadout:${kind}:([^:]+):(.+)$`));
    if (!match) continue;
    (sets[match[1]] ??= {})[match[2]] = toProfileItem(item);
  }
  return sets;
}

function loadoutNames(value: Record<string, unknown> | undefined) {
  const names: Record<string, string> = {};
  for (const [id, raw] of Object.entries(value ?? {})) {
    if (!isRecord(raw) || typeof raw.name !== "string") continue;
    names[id] = raw.name;
  }
  return names;
}

function setNumber(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
