import { z } from "zod";

const number = z.number().finite().nonnegative();
const tolerantNumber = z.number().finite().optional().catch(undefined);
const dynamicObject = z.record(z.string(), z.unknown());
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
  player_data: z.object({ experience: z.record(z.string(), number).optional(),
    unlocked_coll_tiers: z.array(z.string()).optional().catch(undefined), crafted_generators: z.array(z.string()).optional().catch(undefined),
  }).passthrough().optional(),
  inventory: z.object({
    inv_contents: encoded.optional(), ender_chest_contents: encoded.optional(),
    inv_armor: encoded.optional(), equipment_contents: encoded.optional(), wardrobe_contents: encoded.optional(), personal_vault_contents: encoded.optional(),
    backpack_contents: z.record(z.string(), encoded).optional(),
    backpack_icons: z.record(z.string(), encoded).optional(),
    bag_contents: z.object({ talisman_bag: encoded.optional() }).optional(),
  }).optional(),
  pets_data: z.object({ pets: z.array(rawPetSchema).optional(),
    pet_care: z.object({ pet_types_sacrificed: z.array(z.string()).optional() }).optional(),
  }).optional(),
  jacobs_contest: z.object({ perks: z.object({ farming_level_cap: number.optional() }).optional() }).passthrough().optional(),
  slayer: z.object({ slayer_bosses: z.record(z.string(), z.object({
    xp: number.optional(), boss_kills_tier_0: number.optional(), boss_kills_tier_1: number.optional(),
    boss_kills_tier_2: number.optional(), boss_kills_tier_3: number.optional(), boss_kills_tier_4: number.optional(),
  })) }).optional(),
  dungeons: z.object({
    dungeon_types: z.object({ catacombs: dungeonRun.optional(), master_catacombs: dungeonRun.optional() }).optional(),
    player_classes: z.record(z.string(), z.object({ experience: number.optional() })).optional(),
    selected_dungeon_class: z.string().optional(), secrets: number.optional(),
  }).optional(),
  mining_core: z.object({
    powder_mithril: tolerantNumber, powder_mithril_total: tolerantNumber, powder_spent_mithril: tolerantNumber,
    powder_gemstone: tolerantNumber, powder_gemstone_total: tolerantNumber, powder_spent_gemstone: tolerantNumber,
    powder_glacite: tolerantNumber, powder_glacite_total: tolerantNumber, powder_spent_glacite: tolerantNumber,
    powder_spent_glacite_2: tolerantNumber, powder_spent_non_refundable_glacite: tolerantNumber, powder_spent_non_refundable_glacite_2: tolerantNumber,
    powder_spent_non_refundable_mithril: tolerantNumber, powder_spent_non_refundable_mithril_2: tolerantNumber,
    daily_ores_mined: tolerantNumber, daily_ores_mined_gemstone: tolerantNumber, daily_ores_mined_glacite: tolerantNumber,
    daily_ores_mined_mithril_ore: tolerantNumber, crystals: dynamicObject.optional().catch(undefined), biomes: dynamicObject.optional().catch(undefined),
  }).passthrough().optional(),
  skill_tree: z.object({ nodes: z.object({ mining: dynamicObject.optional(), foraging: dynamicObject.optional() }).passthrough().optional(),
    experience: dynamicObject.optional(), tokens_spent: z.unknown().optional(), selected_ability: z.unknown().optional(),
    selected_skill_tree_slot: z.unknown().optional(), last_reset: tolerantNumber,
  }).passthrough().optional(),
  glacite_player_data: z.object({ fossils_donated: z.array(z.string()).optional().catch(undefined), fossil_dust: tolerantNumber,
    corpses_looted: dynamicObject.optional().catch(undefined), mineshafts_entered: tolerantNumber }).passthrough().optional(),
  foraging_core: dynamicObject.optional(), foraging: dynamicObject.optional(),
  accessory_bag_storage: z.object({ selected_power: z.string().optional(), highest_magical_power: tolerantNumber,
    unlocked_powers: z.unknown().optional(), bag_upgrades_purchased: tolerantNumber,
    tuning: z.object({ highest_unlocked_slot: tolerantNumber }).passthrough().optional(),
  }).passthrough().optional(),
  player_stats: z.object({ highest_damage: tolerantNumber, highest_critical_damage: tolerantNumber, kills: dynamicObject.optional(), deaths: dynamicObject.optional(),
    items_fished: z.unknown().optional(), sea_creature_kills: tolerantNumber, pets: dynamicObject.optional(), auctions: dynamicObject.optional(),
    races: dynamicObject.optional(), rift: dynamicObject.optional(),
  }).passthrough().optional(),
  trophy_fish: dynamicObject.optional(), attributes: z.object({ stacks: dynamicObject.optional() }).passthrough().optional(),
  shards: z.object({ owned: z.unknown().optional(), fused: z.unknown().optional(), traps: z.unknown().optional() }).passthrough().optional(),
  collection: dynamicObject.optional(), bestiary: z.object({ kills: dynamicObject.optional(), deaths: dynamicObject.optional(),
    milestone: z.unknown().optional(), miscellaneous: dynamicObject.optional() }).passthrough().optional(),
  fairy_soul: z.unknown().optional(), leveling: z.unknown().optional(), garden_player_data: z.unknown().optional(), forge: z.unknown().optional(),
  nether_island_player_data: z.unknown().optional(),
  rift: z.object({ access: z.object({ consumed_prism: z.boolean().optional() }).passthrough().optional() }).passthrough().optional(),
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
