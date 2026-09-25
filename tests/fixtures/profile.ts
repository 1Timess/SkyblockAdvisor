import { gzipSync } from "node:zlib";
import type { RawMember, RawProfile, HypixelItemDefinition } from "../../src/server/hypixel/types";

// Synthetic Java NBT fixture, independently encoded (not produced by the decoder).
// The root is a compound with an `i` list of item compounds.
const byte = (n: number) => Buffer.from([n]);
function short(n: number) { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; }
function int(n: number) { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; }
function string(value: string) { const b = Buffer.from(value); return Buffer.concat([short(b.length), b]); }
function field(type: number, name: string, value: Buffer) { return Buffer.concat([byte(type), string(name), value]); }
function compound(fields: Buffer[]) { return Buffer.concat([...fields, byte(0)]); }
export type FixtureItem = { id: string; name?: string; lore?: string[]; recombobulated?: boolean };
export function encodeInventory(items: (FixtureItem | null)[], compressed = true): string {
  const compounds = items.map(item => item ? compound([
    field(1, "Count", byte(1)),
    field(10, "tag", compound([
      field(10, "ExtraAttributes", compound([
        field(8, "id", string(item.id)), field(8, "uuid", string(`fixture-${item.id}`)),
        field(3, "rarity_upgrades", int(item.recombobulated ? 1 : 0)),
      ])),
      field(10, "display", compound([
        field(8, "Name", string(item.name ?? item.id)),
        field(9, "Lore", Buffer.concat([byte(8), int(item.lore?.length ?? 0), ...(item.lore ?? []).map(string)])),
      ])),
    ])),
  ]) : compound([]));
  const root = field(10, "", compound([field(9, "i", Buffer.concat([byte(10), int(compounds.length), ...compounds]))]));
  return (compressed ? gzipSync(root) : root).toString("base64");
}

export const fixtureUuid = "0123456789abcdef0123456789abcdef";
export const fixtureIdentity = { uuid: fixtureUuid, username: "FixturePlayer" };
export function fixtureMember(): RawMember {
  return {
    currencies: { coin_purse: 1234 }, profile: { bank_account: 0 },
    inventory: {
      inv_armor: { data: encodeInventory([
        { id: "TEST_BOOTS", lore: ["Health: +10", "COMMON BOOTS"] },
        { id: "TEST_LEGGINGS", lore: ["Health: +20", "UNCOMMON LEGGINGS"] },
        { id: "TEST_CHESTPLATE", lore: ["Defense: +30", "RARE CHESTPLATE"] },
        { id: "TEST_HELMET", lore: ["Defense: +40", "EPIC HELMET"] },
      ]) },
      equipment_contents: { data: encodeInventory([{ id: "TEST_BELT", lore: ["Defense: +5", "RARE BELT"] }]) },
      inv_contents: { data: encodeInventory([{ id: "TEST_SWORD", lore: ["Damage: +100", "Ability: Unmodeled Power RIGHT CLICK", "A mysterious ability remains readable.", "", "RARE SWORD"] }]) },
      ender_chest_contents: { data: encodeInventory([{ id: "WOLF_RING", lore: ["RARE ACCESSORY"] }]) },
      wardrobe_contents: { data: encodeInventory([{ id: "WARDROBE_MINING_HELMET", lore: ["Mining Fortune: +40", "EPIC HELMET"] }]) },
      personal_vault_contents: { data: encodeInventory([{ id: "VAULT_DRILL", lore: ["Mining Speed: +250", "RARE DRILL"] }]) },
      bag_contents: { talisman_bag: { data: encodeInventory([
        { id: "WOLF_TALISMAN", lore: ["COMMON ACCESSORY"] },
        { id: "HEGEMONY_ARTIFACT", lore: ["LEGENDARY ACCESSORY"] },
      ]) } },
      backpack_contents: { "0": { data: encodeInventory([{ id: "TEST_BOW", lore: ["Damage: +50", "EPIC BOW"] }]) } },
    },
    player_data: { experience: { SKILL_COMBAT: 175, SKILL_FARMING: 75, SKILL_TAMING: 0, SKILL_MINING: 175, SKILL_FORAGING: 75, SKILL_FISHING: 50 },
      unlocked_coll_tiers: ["COBBLESTONE_3", "OAK_2"], crafted_generators: ["COBBLESTONE_1", "WHEAT_2"] },
    pets_data: { pets: [{ type: "SHEEP", tier: "COMMON", exp: 150, active: true, heldItem: "PET_ITEM_TIER_BOOST" }] },
    slayer: { slayer_bosses: { zombie: { xp: 200, boss_kills_tier_0: 3, boss_kills_tier_2: 2 } } },
    dungeons: { dungeon_types: { catacombs: { experience: 125, highest_tier_completed: 5, tier_completions: { "5": 2 } },
      master_catacombs: { highest_tier_completed: 1, tier_completions: { "1": 1 } } },
      selected_dungeon_class: "archer", player_classes: { archer: { experience: 50 } }, secrets: 12 },
    mining_core: { powder_mithril: 12345, powder_mithril_total: 20000, powder_spent_mithril: 7655,
      powder_gemstone: 6789, powder_gemstone_total: 8000, powder_spent_gemstone: 1211,
      powder_glacite: 4321, powder_glacite_total: 5000, powder_spent_glacite: 679, powder_spent_glacite_2: 111,
      powder_spent_non_refundable_glacite: 250, powder_spent_non_refundable_glacite_2: 500, daily_ores_mined: 20,
      crystals: { jade_crystal: { state: "FOUND", total_found: 3 }, amber_crystal: { state: "NOT_FOUND", total_found: 1 },
        amethyst_crystal: { state: "PLACED", total_found: 2, total_placed: 1 }, sapphire_crystal: { state: "FOUND", total_found: 4 },
        topaz_crystal: {}, jasper_crystal: { state: "FOUND", total_found: 9 } },
      biomes: { precursor: { claiming_with_precursor_apparatus: false }, jungle: { jungle_temple_open: false } } },
    skill_tree: { experience: { mining: 4242, foraging: 2121 }, tokens_spent: { mountain: 7 }, selected_ability: { mining: "mining_speed_boost" },
      selected_skill_tree_slot: { mining: 1 }, last_reset: 1000, nodes: {
        mining: { mining_speed: { level: 12, enabled: true }, arbitrary_toggle: false, efficient_miner: 8 },
        foraging: { sweep: 4, foraging_fortune: { value: 6 }, arbitrary_foraging_node: { level: 2, toggle: true } },
      } },
    glacite_player_data: { fossils_donated: ["CLUBBED", "UGLY"], fossil_dust: 7,
      corpses_looted: { lapis: 12, tungsten: 3, umber: 2, vanguard: 1 }, mineshafts_entered: 19 },
    foraging_core: { whispers: 9, daily_gifts: 2 }, foraging: { daily_log_cut: 40, future_counter: 3 },
    accessory_bag_storage: { selected_power: "fortuitous", highest_magical_power: 450,
      unlocked_powers: ["fortuitous", "bloody"], bag_upgrades_purchased: 3,
      tuning: { highest_unlocked_slot: 1, slot_0: { strength: 5, critical_damage: 2 }, slot_1: { intelligence: 7 } } },
    player_stats: { highest_damage: 123456, highest_critical_damage: 654321, items_fished: { total: 321, normal: 300 }, sea_creature_kills: 45,
      kills: { zombie: 10 }, deaths: { void: 2 }, pets: { crafted: 1 }, auctions: { bids: 4 }, races: { end: 20 }, rift: { visits: 3 } },
    trophy_fish: { blobfish_bronze: 2, karate_fish_silver: 1 }, attributes: { stacks: { veteran: 4, mana_pool: 2, cold_resistance: 24 } },
    shards: { owned: { SHARD_A: 2 }, fused: { SHARD_B: 1 }, traps: ["SHARD_C"] },
    collection: { COBBLESTONE: 1234, OAK_LOG: 567 }, bestiary: { kills: { zombie: 10 }, deaths: { zombie: 1 }, milestone: 5, miscellaneous: { families_found: 2 } },
  };
}
export function fixtureProfiles(member = fixtureMember()): RawProfile[] {
  return [{ profile_id: "fixture-profile", cute_name: "Apple", selected: true, banking: { balance: 1000 }, members: { [fixtureUuid]: member } }];
}
export const fixtureCatalog: HypixelItemDefinition[] = [
  { id: "WOLF_TALISMAN", name: "Wolf Talisman", category: "ACCESSORY", tier: "COMMON" },
  { id: "WOLF_RING", name: "Wolf Ring", category: "ACCESSORY", tier: "RARE" },
  { id: "FEATHER_TALISMAN", name: "Feather Talisman", category: "ACCESSORY", tier: "COMMON" },
  { id: "FEATHER_RING", name: "Feather Ring", category: "ACCESSORY", tier: "UNCOMMON" },
];
export function fixtureSources(member = fixtureMember()) {
  return { resolvePlayer: async () => fixtureIdentity, getProfiles: async () => fixtureProfiles(member), getItems: async () => fixtureCatalog };
}
