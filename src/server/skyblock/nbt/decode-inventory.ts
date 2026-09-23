import * as nbt from "prismarine-nbt";
import type { EncodedItems } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";

export async function decodeInventory(encoded: EncodedItems | undefined, source: string, warnings: ProfileWarning[]): Promise<unknown[]> {
  if (!encoded?.data) return [];
  try {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded.data)) throw new Error("Invalid base64");
    const { parsed } = await nbt.parse(Buffer.from(encoded.data, "base64"), "big");
    const simplified = nbt.simplify(parsed) as { i?: unknown };
    return Array.isArray(simplified?.i) ? simplified.i : [];
  } catch {
    warnings.push({ code: "INVENTORY_DECODE_FAILED", scope: source, message: `Could not decode ${source}; other sections remain available.` });
    return [];
  }
}
