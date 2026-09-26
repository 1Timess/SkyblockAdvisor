import assert from "node:assert/strict";
import test from "node:test";
import type { PetMutation } from "../src/schemas/pet-mutations";
import type { PetMarketResolver } from "../src/server/pets/market";
import { pricePetMutation } from "../src/server/pets/market";

function mutation(overrides: Partial<PetMutation> = {}): PetMutation {
  return {
    mutationId: "pet:test", kind: "ACQUIRE", assessment: "UNCERTAIN", sourceSetupId: null, before: null,
    after: { type: "SCATHA", canonicalPetId: "SCATHA;4", baseRarity: "legendary", effectiveRarity: "legendary", level: 1, maxLevel: 100, heldItem: null },
    requirements: { coins: null, timeSeconds: null, itemCosts: [], marketPriceRequired: true },
    reasons: [], uncertainty: [], ...overrides,
  };
}
function resolver(pets: Record<string, number> = {}, items: Record<string, number> = {}): PetMarketResolver {
  return {
    async quotePet(id) { return pets[id] == null ? null : { key: `pet:${id}`, coins: pets[id], observedAt: "2026-09-26T00:00:00Z", source: "TEST", confidence: "HIGH" }; },
    async quoteItem(id) { return items[id] == null ? null : { key: `item:${id}`, coins: items[id], observedAt: "2026-09-26T00:00:00Z", source: "TEST", confidence: "HIGH" }; },
  };
}

test("acquisition resolves from the concrete canonical pet variant", async () => {
  const priced = await pricePetMutation(mutation(), resolver({ "SCATHA;4": 42_000_000 }));
  assert.equal(priced.costStatus, "RESOLVED");
  assert.equal(priced.totalCoins, 42_000_000);
});

test("Kat combines fixed coins and counted item quotes", async () => {
  const kat = mutation({
    kind: "KAT_UPGRADE", sourceSetupId: "one",
    before: { type: "SCATHA", canonicalPetId: "SCATHA;2", baseRarity: "rare", effectiveRarity: "rare", level: 80, maxLevel: 100, heldItem: null },
    after: { type: "SCATHA", canonicalPetId: "SCATHA;3", baseRarity: "epic", effectiveRarity: "epic", level: 80, maxLevel: 100, heldItem: null },
    requirements: { coins: 1_000_000, timeSeconds: 60, itemCosts: [{ itemId: "ENCHANTED_MITHRIL", count: 2 }], marketPriceRequired: false },
  });
  const priced = await pricePetMutation(kat, resolver({}, { ENCHANTED_MITHRIL: 50_000 }));
  assert.equal(priced.costStatus, "RESOLVED");
  assert.equal(priced.fixedCoins, 1_000_000);
  assert.equal(priced.marketCoins, 100_000);
  assert.equal(priced.totalCoins, 1_100_000);
});

test("missing Kat ingredient price stays partial instead of becoming zero", async () => {
  const kat = mutation({
    kind: "KAT_UPGRADE", sourceSetupId: "one",
    requirements: { coins: 1_000_000, timeSeconds: 60, itemCosts: [{ itemId: "UNKNOWN", count: 3 }], marketPriceRequired: false },
  });
  const priced = await pricePetMutation(kat, resolver());
  assert.equal(priced.costStatus, "PARTIAL");
  assert.equal(priced.totalCoins, null);
  assert.deepEqual(priced.unresolvedKeys, ["item:UNKNOWN:3"]);
});

test("held-item swap prices the item exactly once", async () => {
  const swap = mutation({
    kind: "CHANGE_HELD_ITEM", sourceSetupId: "one",
    after: { type: "SILVERFISH", canonicalPetId: "SILVERFISH;4", baseRarity: "legendary", effectiveRarity: "legendary", level: 83, maxLevel: 100, heldItem: "PET_ITEM_QUICK_CLAW" },
    requirements: { coins: null, timeSeconds: null, itemCosts: [{ itemId: "PET_ITEM_QUICK_CLAW", count: 1 }], marketPriceRequired: true },
  });
  const priced = await pricePetMutation(swap, resolver({}, { PET_ITEM_QUICK_CLAW: 9_000_000 }));
  assert.equal(priced.marketCoins, 9_000_000);
  assert.equal(priced.quotes.length, 1);
});

test("missing acquisition quote is explicitly unresolved", async () => {
  const priced = await pricePetMutation(mutation(), resolver());
  assert.equal(priced.costStatus, "UNRESOLVED");
  assert.equal(priced.totalCoins, null);
  assert.deepEqual(priced.unresolvedKeys, ["pet:SCATHA;4"]);
});
