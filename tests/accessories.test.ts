import assert from "node:assert/strict";
import test from "node:test";
import { processItem } from "../src/server/skyblock/items/process-item";
import { buildAccessories } from "../src/server/skyblock/domains/accessories";
import { buildAccessoryCatalog } from "../src/server/reference/accessory-data";
import { fixtureCatalog } from "./fixtures/profile";

function item(id: string, rarity = "RARE", source = "talisman_bag", recombobulated = false) {
  return processItem({ tag: { ExtraAttributes: { id, rarity_upgrades: recombobulated ? 1 : 0 }, display: { Name: id, Lore: [`${rarity} ACCESSORY`] } } }, source, 0, [])!;
}

test("outside-bag accessories are owned but inactive and higher upgrades suppress bag items", () => {
  const result = buildAccessories([item("WOLF_TALISMAN", "COMMON"), item("WOLF_RING", "RARE", "backpack:0")], {}, [], []);
  assert.equal(result.owned.length, 2); assert.equal(result.magicalPower.total, 0);
  assert.equal(result.owned[0].inactiveReason, "higher_upgrade_owned");
  assert.equal(result.owned[1].inactiveReason, "outside_accessory_bag");
});
test("aliases and equal duplicates count once, preferring an active equal-rarity copy", () => {
  const result = buildAccessories([item("PARTY_HAT_SLOTH", "RARE", "inventory"), item("PARTY_HAT_CRAB"), item("CAKE_HAT_2026")], {}, [], []);
  assert.equal(result.owned.filter(i => i.active).length, 1);
  assert.equal(result.magicalPower.total, 8);
  assert.equal(result.owned[1].active, true);
});
test("higher-rarity duplicate wins and outside copies never become active", () => {
  const result = buildAccessories([item("DANTE_TALISMAN", "COMMON"), item("DANTE_RING", "RARE", "inventory")], {}, [], []);
  assert.equal(result.magicalPower.total, 0);
  assert.equal(result.owned[0].inactiveReason, "duplicate_or_alias");
});
test("Hegemony doubles rarity MP; physical and consumed Rift Prism contribute 11 once", () => {
  const items = [item("HEGEMONY_ARTIFACT", "MYTHIC"), item("RIFT_PRISM")];
  assert.equal(buildAccessories(items, {}, [], []).magicalPower.total, 55);
  const consumed = buildAccessories(items, { rift: { access: { consumed_prism: true } } }, [], []);
  assert.equal(consumed.magicalPower.accessories, 44); assert.equal(consumed.magicalPower.riftPrism, 11);
  assert.equal(consumed.magicalPower.total, 55);
});
test("catalog applies aliases, exclusions, upgrade chains, and variable rarity mappings", () => {
  const catalog = buildAccessoryCatalog([...fixtureCatalog,
    { id: "BINGO_HEIRLOOM", name: "Excluded", category: "ACCESSORY", tier: "LEGENDARY" },
    { id: "POWER_RELIC", name: "Power Relic", category: "ACCESSORY", tier: "EPIC" },
    { id: "TRAPPER_CREST", name: "Trapper Crest", category: "ACCESSORY", tier: "UNCOMMON" },
  ]);
  assert.equal(catalog.some(i => i.id === "BINGO_HEIRLOOM"), false);
  assert.equal(catalog.find(i => i.id === "POWER_RELIC")?.rarity, "legendary");
  const result = buildAccessories([item("FEATHER_TALISMAN", "COMMON"), item("TRAPPER_CREST", "RARE", "talisman_bag", true)], {}, catalog, []);
  assert.ok(result.upgrades.some(i => i.id === "FEATHER_RING"));
  assert.ok(result.upgrades.some(i => i.id === "TRAPPER_CREST" && i.rarity === "rare"));
  assert.equal(result.missing.some(i => i.id === "FEATHER_TALISMAN"), false);
});
