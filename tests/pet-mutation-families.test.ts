import assert from "node:assert/strict";
import test from "node:test";
import type { PetMutation } from "../src/schemas/pet-mutations";
import { buildPetMutationFamilies } from "../src/server/pets/mutation-families";

function acquire(id: string, rarity: string): PetMutation {
  const type = id.split(";")[0];
  return {
    mutationId: `pet:acquire:${id}`, kind: "ACQUIRE", assessment: "UNCERTAIN", sourceSetupId: null, before: null,
    after: { type, canonicalPetId: id, baseRarity: rarity, effectiveRarity: rarity, level: 1, maxLevel: 100, heldItem: null },
    requirements: { coins: null, timeSeconds: null, itemCosts: [], marketPriceRequired: true },
    reasons: ["Acquire"], uncertainty: ["Unpriced"],
  };
}

test("acquisition variants compress by pet type without losing concrete children", () => {
  const mutations = [acquire("SCATHA;2", "rare"), acquire("SCATHA;3", "epic"), acquire("SCATHA;4", "legendary"), acquire("BAL;4", "legendary")];
  const families = buildPetMutationFamilies("MINING", mutations);
  assert.equal(families.length, 2);
  const scatha = families.find(value => value.petType === "SCATHA");
  assert.ok(scatha);
  assert.equal(scatha.kind, "ACQUIRE_FAMILY");
  assert.deepEqual(scatha.children.map(value => value.after.canonicalPetId), ["SCATHA;2", "SCATHA;3", "SCATHA;4"]);
});

test("non-acquisition concrete mutations remain independent families", () => {
  const level: PetMutation = {
    mutationId: "pet:level:one:100", kind: "LEVEL_TARGET", assessment: "PROGRESSION", sourceSetupId: "one",
    before: { type: "SILVERFISH", canonicalPetId: "SILVERFISH;4", baseRarity: "legendary", effectiveRarity: "legendary", level: 83, maxLevel: 100, heldItem: null },
    after: { type: "SILVERFISH", canonicalPetId: "SILVERFISH;4", baseRarity: "legendary", effectiveRarity: "legendary", level: 100, maxLevel: 100, heldItem: null },
    requirements: { coins: null, timeSeconds: null, itemCosts: [], marketPriceRequired: false }, reasons: ["Level"], uncertainty: [],
  };
  const families = buildPetMutationFamilies("MINING", [level]);
  assert.equal(families.length, 1);
  assert.equal(families[0].kind, "CONCRETE_MUTATION");
  assert.equal(families[0].children[0].mutationId, level.mutationId);
});
