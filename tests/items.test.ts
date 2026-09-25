import assert from "node:assert/strict";
import test from "node:test";
import { decodeInventory } from "../src/server/skyblock/nbt/decode-inventory";
import { processItem, toProfileItem } from "../src/server/skyblock/items/process-item";
import { buildGear } from "../src/server/skyblock/domains/gear";
import type { ProfileWarning } from "../src/schemas/items";
import { encodeInventory, fixtureMember } from "./fixtures/profile";

test("synthetic Java NBT decodes compressed and uncompressed, retaining empty slots", async () => {
  for (const compressed of [true, false]) {
    const warnings: ProfileWarning[] = [];
    const data = encodeInventory([null, { id: "SECOND_SLOT", lore: ["RARE SWORD"] }], compressed);
    const decoded = await decodeInventory({ data }, "inventory", warnings);
    assert.equal(decoded.length, 2); assert.equal(processItem(decoded[0], "inventory", 0, warnings), null);
    assert.equal(processItem(decoded[1], "inventory", 1, warnings)?.id, "SECOND_SLOT"); assert.deepEqual(warnings, []);
  }
});
test("empty and malformed inventories are isolated", async () => {
  const warnings: ProfileWarning[] = [];
  assert.deepEqual(await decodeInventory(undefined, "armor", warnings), []); assert.equal(warnings.length, 0);
  assert.deepEqual(await decodeInventory({ data: "not NBT" }, "inventory", warnings), []);
  assert.equal(warnings[0].code, "INVENTORY_DECODE_FAILED");
});
test("item parsing preserves unknown mechanics, raw attributes and known stats", () => {
  const warnings: ProfileWarning[] = [];
  const item = processItem({ Count: 1, tag: { display: { Name: "§6Example", Lore: [
    "§aHealth: +1,200", "Crit Chance: -5.5%", "Gemstone Fortune: +60", "Cold Resistance: +8", "Unknown Stat: +2", "", "Ability: Mystery", "Unmodeled effect.", "", "Full Set Bonus: Mysteries", "An unusual bonus.", "", "§6LEGENDARY DUNGEON CHESTPLATE",
  ] }, ExtraAttributes: { id: "EXAMPLE", rarity_upgrades: 1, modifier: "ancient", upgrade_level: 5, enchantments: { growth: 5 } } } }, "armor", 2, warnings)!;
  assert.equal(item.name, "Example"); assert.deepEqual(item.categories, ["armor", "chestplate"]);
  assert.equal(item.stats.health, 1200); assert.equal(item.stats.critChance, -5.5);
  assert.equal(item.stats.gemstoneFortune, 60); assert.equal(item.stats.coldResistance, 8);
  assert.equal(item.abilityText[1], "Unmodeled effect."); assert.equal(item.setBonusText[1], "An unusual bonus.");
  assert.equal(item.stars, 5); assert.equal(item.recombobulated, true); assert.equal(item.extraAttributes.modifier, "ancient");
  assert.equal("extraAttributes" in toProfileItem(item), false); assert.equal(warnings[0].code, "UNKNOWN_ITEM_STAT");
});
test("armor returns helmet through boots and sums known stats", async () => {
  const warnings: ProfileWarning[] = [];
  const raw = await decodeInventory(fixtureMember().inventory!.inv_armor, "armor", warnings);
  const items = raw.map((item, index) => processItem(item, "armor", index, warnings)!);
  const gear = buildGear(items);
  assert.deepEqual(gear.armor.items.map(i => i.id), ["TEST_HELMET", "TEST_CHESTPLATE", "TEST_LEGGINGS", "TEST_BOOTS"]);
  assert.deepEqual(gear.armor.stats, { defense: 70, health: 30 });
});
