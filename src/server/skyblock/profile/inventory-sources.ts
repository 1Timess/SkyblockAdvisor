import type { RawMember, EncodedItems } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";

export function collectInventories(member: RawMember, warnings: ProfileWarning[]): { source: string; encoded?: EncodedItems }[] {
  const inventory = member.inventory;
  const sources = [
    { source: "armor", encoded: inventory?.inv_armor },
    { source: "equipment", encoded: inventory?.equipment_contents },
    { source: "inventory", encoded: inventory?.inv_contents },
    { source: "enderchest", encoded: inventory?.ender_chest_contents },
    { source: "talisman_bag", encoded: inventory?.bag_contents?.talisman_bag },
    ...Object.entries(inventory?.backpack_contents ?? {}).map(([key, encoded]) => ({ source: `backpack:${key}`, encoded })),
  ];
  for (const source of sources) {
    if (!source.encoded) warnings.push({ code: "API_DATA_DISABLED", scope: source.source, message: `${source.source} was not supplied; inventory access may be disabled.` });
  }
  return sources;
}
