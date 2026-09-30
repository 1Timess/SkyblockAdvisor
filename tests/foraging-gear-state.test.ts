import assert from "node:assert/strict";
import test from "node:test";
import { indexForagingGear, isForagingItem } from "../src/server/foraging/gear-state";
import type { NormalizedSkyBlockProfile } from "../src/schemas/normalized-profile";

const item = (id: string, lore: string[] = [], source = "inventory") => ({
  id, uuid: `uuid-${id}-${source}`, name: id, count: 1, rarity: "legendary" as const,
  categories: id.includes("HELMET") ? ["armor", "helmet"] : ["axe"], stats: {}, reforge: "moil",
  enchantments: { efficiency: 5 }, stars: 3, recombobulated: true, lore, abilityText: [], setBonusText: [],
  source, foragingState: id === "HELIX_CHOPPER" ? { boosterTiers: { foraging_wisdom: 1 }, absorbLogsChopped: 33522, logsCut: 8181, attributeMenuValue: null, source: "NBT" as const } : undefined, gemstones: { source: "NBT" as const, slots: [{ id: "CITRINE_0", slotType: "CITRINE", status: "FILLED" as const,
    gemstoneType: "CITRINE", quality: "PERFECT" as const, unlockMethod: "ITEM_DEFAULT" as const }] },
});

test("Foraging gear index keeps inventory and equipped loadout evidence distinct", () => {
  const helix = item("HELIX_HELMET", ["Sweep: +20"], "inventory");
  const equipped = item("FIG_HELMET", ["Sweep: +10"], "loadout:armor:2:HELMET");
  const profile = {
    inventoryItems: [helix, equipped, item("TEST_AXE", ["Foraging Fortune: +12"])],
    gear: { loadouts: { armor: { equippedSet: 2, sets: { "2": { HELMET: equipped } } },
      equipment: { equippedSet: null, sets: {} }, names: { "2": "Foraging" } } },
    pets: { owned: [{ type: "FROG", name: "Frog", rarity: "legendary", level: 100, heldItem: null, stats: {}, abilityLore: ["Gain +10 Sweep."] }] },
  } as unknown as NormalizedSkyBlockProfile;
  const state = indexForagingGear(profile);
  assert.equal(state.visible.length, 3);
  assert.equal(state.visible[0].gemstones?.slots[0].slotType, "CITRINE");
  assert.equal(state.equipped.armor?.HELMET.id, "FIG_HELMET");
  const chopper = indexForagingGear({ ...profile, inventoryItems: [item("HELIX_CHOPPER")] } as unknown as NormalizedSkyBlockProfile).visible[0];
  assert.deepEqual(chopper.foragingState?.boosterTiers, { foraging_wisdom: 1 });
  assert.equal(chopper.foragingState?.logsCut, 8181);
  assert.equal(state.equipped.equipment, null);
  assert.equal(state.pets[0].type, "FROG");
});

test("Foraging classifier accepts canonical and mechanic evidence without generic armor leakage", () => {
  assert.equal(isForagingItem(item("HELIX_CHOPPER")), true);
  assert.equal(isForagingItem(item("FUTURE_AXE", ["Sweep: +5"])), true);
  const armor = { ...item("RANDOM_HELMET"), categories: ["armor", "helmet"], lore: ["Health: +100"] };
  assert.equal(isForagingItem(armor), false);
});
