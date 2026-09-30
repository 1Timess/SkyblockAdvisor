import assert from "node:assert/strict";
import test from "node:test";
import { buildForagingGearMechanics } from "../src/server/foraging/gear-mechanics";
import type { NormalizedSkyBlockProfile } from "../src/schemas/normalized-profile";
import type { ProfileItem } from "../src/schemas/items";

function item(id: string, sweep: number): ProfileItem {
  return { id, uuid: id, name: id, count: 1, rarity: "LEGENDARY", categories: ["axe"], source: "inventory",
    stats: { sweep, foragingFortune: 83, foragingWisdom: 6 }, reforge: null, enchantments: {}, stars: 5, recombobulated: false,
    lore: ["Sweep: +" + sweep], abilityText: [], setBonusText: [], gemstones: undefined,
    foragingState: { boosterTiers: { foraging_wisdom: 1 }, absorbLogsChopped: 33522, logsCut: 8181, attributeMenuValue: null, source: "NBT" } };
}

test("keeps verified base Sweep separate from observed live Sweep", () => {
  const profile = { inventoryItems: [item("HELIX_CHOPPER", 55)], gear: { loadouts: { armor: { equippedSet: null, sets: {} },
    equipment: { equippedSet: null, sets: {} } } }, pets: { owned: [] } } as unknown as NormalizedSkyBlockProfile;
  const mechanics = buildForagingGearMechanics(profile);
  assert.equal(mechanics.items.length, 1);
  assert.equal(mechanics.items[0].verifiedBaseSweep, 50);
  assert.equal(mechanics.items[0].observedSweep, 55);
  assert.equal(mechanics.items[0].foragingState?.logsCut, 8181);
  assert.ok(mechanics.items[0].warnings[0].includes("not attributed"));
});

test("does not manufacture a verified base value for an unknown Foraging item", () => {
  const profile = { inventoryItems: [item("FUTURE_FORAGING_AXE", 12)], gear: { loadouts: { armor: { equippedSet: null, sets: {} },
    equipment: { equippedSet: null, sets: {} } } }, pets: { owned: [] } } as unknown as NormalizedSkyBlockProfile;
  const observed = buildForagingGearMechanics(profile).items[0];
  assert.equal(observed.verifiedBaseSweep, null);
  assert.equal(observed.observedSweep, 12);
  assert.deepEqual(observed.warnings, []);
});
