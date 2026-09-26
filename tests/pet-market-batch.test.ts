import assert from "node:assert/strict";
import test from "node:test";
import type { PetMutation } from "../src/schemas/pet-mutations";
import { pricePetMutations } from "../src/server/pets/market-batch";

function swap(id: string): PetMutation {
  return {
    mutationId: `swap:${id}`, kind: "CHANGE_HELD_ITEM", assessment: "SIDEGRADE", sourceSetupId: id,
    before: { type: "SILVERFISH", canonicalPetId: "SILVERFISH;4", baseRarity: "legendary", effectiveRarity: "legendary", level: 83, maxLevel: 100, heldItem: null },
    after: { type: "SILVERFISH", canonicalPetId: "SILVERFISH;4", baseRarity: "legendary", effectiveRarity: "legendary", level: 83, maxLevel: 100, heldItem: "PET_ITEM_QUICK_CLAW" },
    requirements: { coins: null, timeSeconds: null, itemCosts: [{ itemId: "PET_ITEM_QUICK_CLAW", count: 1 }], marketPriceRequired: true },
    reasons: [], uncertainty: [],
  };
}

test("batch pricing requests a shared market key only once", async () => {
  let itemCalls = 0;
  const priced = await pricePetMutations([swap("a"), swap("b")], {
    async quoteItem(itemId) {
      itemCalls++;
      return { key: `item:${itemId}`, coins: 10, observedAt: null, source: "TEST", confidence: "HIGH" };
    },
  });
  assert.equal(priced.length, 2);
  assert.equal(itemCalls, 1);
  assert.equal(priced[0].totalCoins, 10);
  assert.equal(priced[1].totalCoins, 10);
});
