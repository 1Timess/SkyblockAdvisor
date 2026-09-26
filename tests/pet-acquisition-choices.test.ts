import assert from "node:assert/strict";
import test from "node:test";
import type { CanonicalPetDefinition } from "../src/schemas/pet-mechanics";
import type { PetMarketListing } from "../src/schemas/pet-market";
import { buildPetAcquisitionChoices } from "../src/server/pets/acquisition-choices";

function definition(id: string, maxLevel: number): CanonicalPetDefinition {
  return {
    id, type: id.split(";")[0], rarity: "legendary", petSkillType: null, maxLevel,
    rarityOffset: 0, xpCurve: [], xpMultiplier: 1, customLevelingType: null,
    baseStatTemplates: {}, abilities: [], upgradePaths: [], source: "NEU",
  };
}
function listing(id: string, pet: string, level: number, coins: number): PetMarketListing {
  return { listingId: id, canonicalPetId: pet, level, coins, observedAt: null, source: "TEST" };
}

test("level-200 pet flows from canonical max level through observed market choices", () => {
  const pet = "GOLDEN_DRAGON;4";
  const choices = buildPetAcquisitionChoices({
    definition: definition(pet, 200),
    listings: [
      listing("l1", pet, 1, 100),
      listing("a", pet, 40, 150), listing("b", pet, 45, 160),
      listing("c", pet, 90, 220), listing("d", pet, 95, 230),
      listing("e", pet, 140, 300), listing("f", pet, 145, 310),
      listing("g", pet, 190, 400), listing("h", pet, 195, 410),
      listing("l200", pet, 200, 450),
    ],
    heldItemCoins: 50,
  });
  assert.deepEqual(choices.map(choice => [choice.bucket.minLevel, choice.bucket.maxLevel]), [
    [1, 1], [2, 50], [51, 100], [101, 149], [150, 199], [200, 200],
  ]);
  assert.equal(choices[0].totalCoins, 150);
  assert.equal(choices.at(-1)?.totalCoins, 500);
});

test("normal level-100 pet uses its own canonical bands", () => {
  const pet = "SCATHA;4";
  const choices = buildPetAcquisitionChoices({
    definition: definition(pet, 100),
    listings: [
      listing("l1", pet, 1, 10),
      listing("a", pet, 20, 20), listing("b", pet, 25, 25),
      listing("c", pet, 40, 30), listing("d", pet, 50, 35),
      listing("e", pet, 60, 40), listing("f", pet, 70, 45),
      listing("g", pet, 90, 50), listing("h", pet, 99, 55),
      listing("l100", pet, 100, 60),
    ],
  });
  assert.deepEqual(choices.map(choice => [choice.bucket.minLevel, choice.bucket.maxLevel]), [
    [1, 1], [2, 25], [26, 50], [51, 74], [75, 99], [100, 100],
  ]);
  assert.equal(choices.at(-1)?.level, 100);
});

test("missing market bands remain absent rather than synthesized", () => {
  const pet = "SCATHA;4";
  const choices = buildPetAcquisitionChoices({
    definition: definition(pet, 100),
    listings: [listing("l1", pet, 1, 10), listing("l100", pet, 100, 60)],
  });
  assert.deepEqual(choices.map(choice => choice.level), [1, 100]);
});

test("foreign rarity listings never enter acquisition choices", () => {
  const choices = buildPetAcquisitionChoices({
    definition: definition("SCATHA;4", 100),
    listings: [listing("wrong", "SCATHA;3", 100, 1)],
  });
  assert.deepEqual(choices, []);
});
