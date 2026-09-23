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
      bag_contents: { talisman_bag: { data: encodeInventory([
        { id: "WOLF_TALISMAN", lore: ["COMMON ACCESSORY"] },
        { id: "HEGEMONY_ARTIFACT", lore: ["LEGENDARY ACCESSORY"] },
      ]) } },
      backpack_contents: { "0": { data: encodeInventory([{ id: "TEST_BOW", lore: ["Damage: +50", "EPIC BOW"] }]) } },
    },
    player_data: { experience: { SKILL_COMBAT: 175, SKILL_FARMING: 75, SKILL_TAMING: 0 } },
    pets_data: { pets: [{ type: "SHEEP", tier: "COMMON", exp: 150, active: true, heldItem: "PET_ITEM_TIER_BOOST" }] },
    slayer: { slayer_bosses: { zombie: { xp: 200, boss_kills_tier_0: 3, boss_kills_tier_2: 2 } } },
    dungeons: { dungeon_types: { catacombs: { experience: 125, highest_tier_completed: 5, tier_completions: { "5": 2 } },
      master_catacombs: { highest_tier_completed: 1, tier_completions: { "1": 1 } } },
      selected_dungeon_class: "archer", player_classes: { archer: { experience: 50 } }, secrets: 12 },
    accessory_bag_storage: { selected_power: "fortuitous" },
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
