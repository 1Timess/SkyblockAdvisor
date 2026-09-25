import type { RawMember, EncodedItems } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";

export function collectInventories(member: RawMember, warnings: ProfileWarning[]): { source: string; encoded?: EncodedItems }[] {
  const inventory = member.inventory;
  const sources = [
    { source: "armor", encoded: inventory?.inv_armor },
    { source: "equipment", encoded: inventory?.equipment_contents },
    { source: "inventory", encoded: inventory?.inv_contents },
    { source: "enderchest", encoded: inventory?.ender_chest_contents },
    { source: "wardrobe", encoded: inventory?.wardrobe_contents },
    { source: "personal_vault", encoded: inventory?.personal_vault_contents },
    { source: "talisman_bag", encoded: inventory?.bag_contents?.talisman_bag },
    ...Object.entries(inventory?.backpack_contents ?? {}).map(([key, encoded]) => ({ source: `backpack:${key}`, encoded })),
    ...loadoutSources(member.loadout?.armor, "armor"),
    ...loadoutSources(member.loadout?.equipment, "equipment"),
  ];
  for (const source of sources) {
    if (!source.encoded) warnings.push({ code: "API_DATA_DISABLED", scope: source.source, message: `${source.source} was not supplied; inventory access may be disabled.` });
  }
  if (!member.loadout?.armor) warnings.push({ code: "API_DATA_DISABLED", scope: "loadout.armor", message: "Armor loadouts were not supplied; stored armor baselines may be incomplete." });
  if (!member.loadout?.equipment) warnings.push({ code: "API_DATA_DISABLED", scope: "loadout.equipment", message: "Equipment loadouts were not supplied; stored equipment baselines may be incomplete." });
  return sources;
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
