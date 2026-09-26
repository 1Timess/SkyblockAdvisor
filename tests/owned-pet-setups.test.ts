import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedPet } from "../src/schemas/pets";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition } from "../src/schemas/pet-mechanics";
import { buildOwnedPetSetups } from "../src/server/pets/owned-setups";

function pet(overrides: Partial<NormalizedPet> = {}): NormalizedPet {
  return {
    uuid: null, type: "SCATHA", name: "Scatha", rarity: "epic", effectiveRarity: "epic",
    level: 80, maxLevel: 100, xp: 12345, xpCurrent: 345, xpForNext: 1000, progress: 0.345,
    active: false, heldItem: null, candyUsed: 0, skin: null, stats: {}, abilityLore: [], ...overrides,
  };
}
function definition(id: string): CanonicalPetDefinition {
  const [type, tier] = id.split(";");
  return {
    id, type, rarity: ["common", "uncommon", "rare", "epic", "legendary", "mythic"][Number(tier)],
    petSkillType: "MINING", maxLevel: 100, rarityOffset: 16, xpCurve: Array(99).fill(100), xpMultiplier: 1,
    customLevelingType: null, baseStatTemplates: {}, abilities: [], upgradePaths: [], source: "NEU",
  };
}
function petItem(itemId: string): CanonicalPetItemDefinition {
  return { itemId, effects: [], conditions: [], rawLore: [], parseStatus: "UNPARSED", confidence: "LOW", source: "NEU" };
}

test("owned setup preserves every concrete duplicate pet", () => {
  const pets = [
    pet({ uuid: "scatha-a", xp: 7900, level: 80, xpCurrent: 0, xpForNext: 100, progress: 0, heldItem: "PET_ITEM_QUICK_CLAW" }),
    pet({ uuid: "scatha-b", level: 100, heldItem: "PET_ITEM_TIER_BOOST", effectiveRarity: "legendary" }),
  ];
  const setups = buildOwnedPetSetups({
    pets, definitions: [definition("SCATHA;3")],
    petItems: [petItem("PET_ITEM_QUICK_CLAW"), petItem("PET_ITEM_TIER_BOOST")],
  });
  assert.equal(setups.length, 2);
  assert.deepEqual(setups.map(value => value.setupId), ["pet:scatha-a", "pet:scatha-b"]);
  assert.deepEqual(setups.map(value => value.heldItem), ["PET_ITEM_QUICK_CLAW", "PET_ITEM_TIER_BOOST"]);
  assert.deepEqual(setups.map(value => value.level), [80, 100]);
});

test("canonical definition is authoritative for resolved level state", () => {
  const [setup] = buildOwnedPetSetups({
    pets: [pet({ uuid: "leveled", xp: 250, level: 99, maxLevel: 100, xpCurrent: 999, xpForNext: 999, progress: 0.999 })],
    definitions: [definition("SCATHA;3")],
  });
  assert.equal(setup.level, 3);
  assert.equal(setup.xpCurrent, 50);
  assert.equal(setup.xpForNext, 100);
  assert.equal(setup.progress, 0.5);
});

test("Tier Boost keeps base rarity separate from effective rarity and resolves the base definition", () => {
  const [setup] = buildOwnedPetSetups({
    pets: [pet({ uuid: "boosted", rarity: "epic", effectiveRarity: "legendary", heldItem: "PET_ITEM_TIER_BOOST" })],
    definitions: [definition("SCATHA;3"), definition("SCATHA;4")],
    petItems: [petItem("PET_ITEM_TIER_BOOST")],
  });
  assert.equal(setup.baseRarity, "epic");
  assert.equal(setup.effectiveRarity, "legendary");
  assert.equal(setup.canonicalPetId, "SCATHA;3");
  assert.equal(setup.canonicalPetItemId, "PET_ITEM_TIER_BOOST");
});

test("active state belongs to the concrete pet copy", () => {
  const setups = buildOwnedPetSetups({
    pets: [pet({ uuid: "inactive" }), pet({ uuid: "active", active: true })],
    definitions: [definition("SCATHA;3")],
  });
  assert.equal(setups.find(value => value.setupId === "pet:inactive")?.active, false);
  assert.equal(setups.find(value => value.setupId === "pet:active")?.active, true);
});

test("legacy pets without UUIDs remain distinct by source order", () => {
  const setups = buildOwnedPetSetups({
    pets: [pet(), pet()],
    definitions: [definition("SCATHA;3")],
  });
  assert.equal(setups.length, 2);
  assert.notEqual(setups[0].setupId, setups[1].setupId);
});

test("missing canonical data fails soft without dropping player state", () => {
  const [setup] = buildOwnedPetSetups({
    pets: [pet({ uuid: "future-pet", type: "FUTURE_PET", rarity: "mythic", effectiveRarity: "mythic", heldItem: "FUTURE_ITEM" })],
    definitions: [], petItems: [],
  });
  assert.equal(setup.type, "FUTURE_PET");
  assert.equal(setup.heldItem, "FUTURE_ITEM");
  assert.equal(setup.canonicalPetId, null);
  assert.equal(setup.canonicalPetItemId, null);
  assert.deepEqual(setup.resolution, { petDefinition: "MISSING", petItemDefinition: "MISSING" });
});
