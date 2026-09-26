import assert from "node:assert/strict";
import test from "node:test";
import type { OwnedPetSetup } from "../src/schemas/owned-pet-setup";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition } from "../src/schemas/pet-mechanics";
import { buildPetMutations } from "../src/server/pets/mutations";

function definition(id: string, rarity: string, maxLevel = 100): CanonicalPetDefinition {
  return { id, type: id.split(";")[0], rarity, petSkillType: "MINING", maxLevel, rarityOffset: 0, xpCurve: [], xpMultiplier: 1,
    customLevelingType: null, baseStatTemplates: {}, abilities: [], upgradePaths: [], source: "NEU" };
}
function setup(overrides: Partial<OwnedPetSetup> = {}): OwnedPetSetup {
  return { setupId: "pet:one", uuid: "one", type: "SCATHA", name: "Scatha", baseRarity: "rare", effectiveRarity: "rare",
    xp: 0, level: 80, maxLevel: 100, xpCurrent: 0, xpForNext: 1, progress: 0, heldItem: null, candyUsed: 0, skin: null,
    active: false, canonicalPetId: "SCATHA;2", canonicalPetItemId: null,
    resolution: { petDefinition: "RESOLVED", petItemDefinition: "NONE" }, ...overrides };
}

test("Kat mutation preserves the concrete setup and structured costs", () => {
  const rare = definition("SCATHA;2", "rare");
  rare.upgradePaths = [{ operation: "KAT", inputId: "SCATHA;2", outputId: "SCATHA;3", coins: 1000, timeSeconds: 60, itemCosts: [{ itemId: "ENCHANTED_MITHRIL", count: 2 }] }];
  const epic = definition("SCATHA;3", "epic");
  const [mutation] = buildPetMutations({ setups: [setup()], definitions: [rare, epic] }).filter(value => value.kind === "KAT_UPGRADE");
  assert.equal(mutation.assessment, "PROGRESSION");
  assert.equal(mutation.before?.level, 80);
  assert.equal(mutation.after.level, 80);
  assert.equal(mutation.after.baseRarity, "epic");
  assert.equal(mutation.requirements.coins, 1000);
  assert.deepEqual(mutation.requirements.itemCosts, [{ itemId: "ENCHANTED_MITHRIL", count: 2 }]);
});

test("level targets are monotonic, bounded, and omit maxed pets", () => {
  const mutations = buildPetMutations({ setups: [setup()], definitions: [definition("SCATHA;2", "rare")] });
  assert.deepEqual(mutations.filter(value => value.kind === "LEVEL_TARGET").map(value => value.after.level), [100]);
  const maxed = buildPetMutations({ setups: [setup({ level: 100 })], definitions: [definition("SCATHA;2", "rare")] });
  assert.equal(maxed.some(value => value.kind === "LEVEL_TARGET"), false);
});

test("held-item changes preserve rarity and level and are not pre-ranked as upgrades", () => {
  const item: CanonicalPetItemDefinition = { itemId: "PET_ITEM_QUICK_CLAW", effects: [], conditions: [], rawLore: [], parseStatus: "FULL", confidence: "HIGH", source: "NEU" };
  const [mutation] = buildPetMutations({ setups: [setup()], definitions: [definition("SCATHA;2", "rare")], petItems: [item], candidatePetItemIds: [item.itemId] }).filter(value => value.kind === "CHANGE_HELD_ITEM");
  assert.equal(mutation.assessment, "SIDEGRADE");
  assert.equal(mutation.after.level, 80);
  assert.equal(mutation.after.baseRarity, "rare");
  assert.equal(mutation.after.heldItem, item.itemId);
});

test("acquisition is explicit and market-unresolved", () => {
  const mutations = buildPetMutations({ setups: [setup()], definitions: [definition("SCATHA;2", "rare"), definition("BAL;4", "legendary")], candidatePetIds: ["BAL;4"] });
  const acquire = mutations.find(value => value.kind === "ACQUIRE");
  assert.ok(acquire);
  assert.equal(acquire.before, null);
  assert.equal(acquire.assessment, "UNCERTAIN");
  assert.equal(acquire.requirements.marketPriceRequired, true);
});

test("already-owned canonical variants are not emitted as acquisition no-ops", () => {
  const mutations = buildPetMutations({ setups: [setup()], definitions: [definition("SCATHA;2", "rare")], candidatePetIds: ["SCATHA;2"] });
  assert.equal(mutations.some(value => value.kind === "ACQUIRE"), false);
});

test("duplicate owned pets keep independent mutation identities", () => {
  const definitions = [definition("SCATHA;2", "rare")];
  const mutations = buildPetMutations({ setups: [setup(), setup({ setupId: "pet:two", uuid: "two", level: 50 })], definitions });
  const ids = mutations.filter(value => value.kind === "LEVEL_TARGET").map(value => value.mutationId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.some(id => id.includes("pet:one")));
  assert.ok(ids.some(id => id.includes("pet:two")));
});
