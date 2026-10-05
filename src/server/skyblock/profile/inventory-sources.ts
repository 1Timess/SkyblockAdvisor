import type { RawMember, EncodedItems } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";

export type InventorySourceOptions = {
  armor?: boolean;
  equipment?: boolean;
  inventory?: boolean;
  accessories?: boolean;
  storage?: boolean;
  loadouts?: boolean;
};

export function collectInventories(member: RawMember, warnings: ProfileWarning[], options: InventorySourceOptions = {
  armor: true, equipment: true, inventory: true, accessories: true, storage: true, loadouts: true,
}): { source: string; encoded?: EncodedItems }[] {
  const inventory = member.inventory;
  const sources: { source: string; encoded?: EncodedItems }[] = [];

  if (options.armor) sources.push({ source: "armor", encoded: inventory?.inv_armor });
  if (options.equipment) sources.push({ source: "equipment", encoded: inventory?.equipment_contents });
  if (options.inventory) sources.push({ source: "inventory", encoded: inventory?.inv_contents });

  if (options.accessories) {
    sources.push({ source: "talisman_bag", encoded: inventory?.bag_contents?.talisman_bag });
  }

  if (options.storage) {
    sources.push({ source: "enderchest", encoded: inventory?.ender_chest_contents });
    sources.push(...Object.entries(inventory?.backpack_contents ?? {}).map(([key, encoded]) => ({ source: `backpack:${key}`, encoded })));
    sources.push({ source: "personal_vault", encoded: inventory?.personal_vault_contents });
    sources.push({ source: "wardrobe", encoded: inventory?.wardrobe_contents });
  }

  if (options.loadouts) {
    sources.push(...loadoutSources(member.loadout?.armor, "armor"));
    sources.push(...loadoutSources(member.loadout?.equipment, "equipment"));
  }

  const uniqueSources = [...new Map(sources.map(source => [source.source, source])).values()];

  for (const source of uniqueSources) {
    if (!source.encoded) warnings.push({ code: "API_DATA_DISABLED", scope: source.source, message: `${source.source} was not supplied; inventory access may be disabled.` });
  }
  if (options.loadouts) {
    if (!member.loadout?.armor) warnings.push({ code: "API_DATA_DISABLED", scope: "loadout.armor", message: "Armor loadouts were not supplied; stored armor baselines may be incomplete." });
    if (!member.loadout?.equipment) warnings.push({ code: "API_DATA_DISABLED", scope: "loadout.equipment", message: "Equipment loadouts were not supplied; stored equipment baselines may be incomplete." });
  }
  return uniqueSources;
}

function loadoutSources(section: Record<string, unknown> | undefined, kind: "armor" | "equipment") {
  if (!section) return [];
  const result: { source: string; encoded?: EncodedItems }[] = [];
  for (const [setId, rawSet] of Object.entries(section)) {
    if (setId === "equipped_set" || !isRecord(rawSet)) continue;
    for (const [slot, rawItem] of Object.entries(rawSet)) {
      if (slot === "id" || !isRecord(rawItem) || typeof rawItem.data !== "string") continue;
      result.push({ source: `loadout:${kind}:${setId}:${slot.toLowerCase()}`, encoded: { data: rawItem.data } });
    }
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
