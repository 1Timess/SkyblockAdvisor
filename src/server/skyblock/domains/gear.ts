import type { ProcessedItem } from "../../../schemas/items";
import { toProfileItem } from "../items/process-item";

function section(items: ProcessedItem[]) {
  const stats: Record<string, number> = {};
  for (const item of items) for (const [key, value] of Object.entries(item.stats)) stats[key] = (stats[key] ?? 0) + value;
  return { items: items.map(toProfileItem), stats };
}

export function buildGear(items: ProcessedItem[]) {
  const order = ["helmet", "chestplate", "leggings", "boots"];
  const armor = items.filter(i => i.source === "armor").sort((a, b) => {
    const rank = (item: ProcessedItem) => { const index = order.findIndex(slot => item.categories.includes(slot)); return index < 0 ? 4 : index; };
    return rank(a) - rank(b) || a.slotIndex - b.slotIndex;
  });
  return {
    armor: section(armor), equipment: section(items.filter(i => i.source === "equipment")),
    weapons: items.filter(i => i.categories.includes("weapon")).map(toProfileItem),
  };
}
