import { z } from "zod";

const number = z.number().finite().nonnegative();
const encoded = z.object({ data: z.string().optional() });
const dungeonRun = z.object({
  experience: number.optional(), highest_tier_completed: number.optional(),
  tier_completions: z.record(z.string(), number).optional(),
});
export const rawPetSchema = z.object({
  uuid: z.string().nullish(), uniqueId: z.string().nullish(), type: z.string().optional(),
  exp: number.optional(), active: z.boolean().optional(), tier: z.string().optional(),
  heldItem: z.string().nullable().optional(), candyUsed: number.optional(), skin: z.string().nullable().optional(),
});
export const memberSchema = z.object({
  currencies: z.object({ coin_purse: number.optional() }).optional(),
  profile: z.object({ bank_account: number.optional() }).optional(),
  player_data: z.object({ experience: z.record(z.string(), number).optional() }).optional(),
  inventory: z.object({
    inv_contents: encoded.optional(), ender_chest_contents: encoded.optional(),
    inv_armor: encoded.optional(), equipment_contents: encoded.optional(),
    backpack_contents: z.record(z.string(), encoded).optional(),
    backpack_icons: z.record(z.string(), encoded).optional(),
    bag_contents: z.object({ talisman_bag: encoded.optional() }).optional(),
  }).optional(),
  pets_data: z.object({ pets: z.array(rawPetSchema).optional(),
    pet_care: z.object({ pet_types_sacrificed: z.array(z.string()).optional() }).optional(),
  }).optional(),
  jacobs_contest: z.object({ perks: z.object({ farming_level_cap: number.optional() }).optional() }).optional(),
  slayer: z.object({ slayer_bosses: z.record(z.string(), z.object({
    xp: number.optional(), boss_kills_tier_0: number.optional(), boss_kills_tier_1: number.optional(),
    boss_kills_tier_2: number.optional(), boss_kills_tier_3: number.optional(), boss_kills_tier_4: number.optional(),
  })) }).optional(),
  dungeons: z.object({
    dungeon_types: z.object({ catacombs: dungeonRun.optional(), master_catacombs: dungeonRun.optional() }).optional(),
    player_classes: z.record(z.string(), z.object({ experience: number.optional() })).optional(),
    selected_dungeon_class: z.string().optional(), secrets: number.optional(),
  }).optional(),
  accessory_bag_storage: z.object({ selected_power: z.string().optional(), highest_magical_power: number.optional() }).optional(),
  rift: z.object({ access: z.object({ consumed_prism: z.boolean().optional() }).optional() }).optional(),
});
export const rawProfileSchema = z.object({
  profile_id: z.string(), cute_name: z.string(), selected: z.boolean().optional(), game_mode: z.string().optional(),
  members: z.record(z.string(), z.unknown()),
  banking: z.object({ balance: number.optional() }).nullable().optional(),
});
export const itemDefinitionSchema = z.object({
  id: z.string(), name: z.string(), category: z.string().optional(), tier: z.string().optional(),
});
export type RawMember = z.infer<typeof memberSchema>;
export type RawProfile = z.infer<typeof rawProfileSchema>;
export type RawPet = z.infer<typeof rawPetSchema>;
export type HypixelItemDefinition = z.infer<typeof itemDefinitionSchema>;
export type EncodedItems = z.infer<typeof encoded>;
