import { z } from "zod";

export const rarities = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "divine", "supreme", "special", "very_special", "admin"] as const;
export const raritySchema = z.enum(rarities);
export const statsSchema = z.record(z.string(), z.number().finite());
export const profileItemSchema = z.object({
  id: z.string().nullable(), uuid: z.string().nullable(), name: z.string(), count: z.number().int().nonnegative(),
  rarity: raritySchema.nullable(), categories: z.array(z.string()), stats: statsSchema,
  reforge: z.string().nullable(), enchantments: statsSchema, stars: z.number().nullable(), recombobulated: z.boolean(),
  lore: z.array(z.string()), abilityText: z.array(z.string()), setBonusText: z.array(z.string()),
  source: z.string(), texture: z.string().nullable().optional(),
});
export type ItemRarity = z.infer<typeof raritySchema>;
export type ProfileItem = z.infer<typeof profileItemSchema>;
export type ItemStats = z.infer<typeof statsSchema>;
export type ProcessedItem = ProfileItem & {
  slotIndex: number; rawLore: string[]; cleanLore: string[]; extraAttributes: Record<string, unknown>;
};

export const warningSchema = z.object({
  code: z.enum(["API_DATA_DISABLED", "INVENTORY_DECODE_FAILED", "UNKNOWN_ITEM_CATEGORY", "UNKNOWN_ITEM_STAT", "REFERENCE_DATA_MISSING", "PARTIAL_PROFILE"]),
  message: z.string(), scope: z.string().optional(),
});
export type ProfileWarning = z.infer<typeof warningSchema>;
