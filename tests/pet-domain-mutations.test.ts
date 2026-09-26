import assert from "node:assert/strict";
import test from "node:test";
import type { OwnedPetSetup } from "../src/schemas/owned-pet-setup";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition, PetEffect } from "../src/schemas/pet-mechanics";
import { buildDomainPetMutations } from "../src/server/pets/domain-mutations";

function definition(id: string, rarity: string, effect?: PetEffect): CanonicalPetDefinition {
  return { id, type: id.split(";")[0], rarity, petSkillType: null, maxLevel: 100, rarityOffset: 0, xpCurve: [], xpMultiplier: 1,
    customLevelingType: null, baseStatTemplates: {}, abilities: effect ? [{ name: "Ability", rawLore: [effect.rawText], effects: [effect], conditions: [], parseStatus: "FULL", confidence: "HIGH" }] : [],
    upgradePaths: [], source: "NEU" };
}
function setup(id: string, canonicalPetId: string, type: string, heldItem: string | null = null): OwnedPetSetup {
  return { setupId: id, uuid: id, type, name: type, baseRarity: "legendary", effectiveRarity: "legendary", xp: 0, level: 80, maxLevel: 100,
    xpCurrent: 0, xpForNext: 1, progress: 0, heldItem, candyUsed: 0, skin: null, active: false, canonicalPetId,
    canonicalPetItemId: heldItem, resolution: { petDefinition: "RESOLVED", petItemDefinition: heldItem ? "RESOLVED" : "NONE" } };
}
const mining = (target: string): PetEffect => ({ kind: "FLAT_STAT", target, valueTemplate: "1", rawText: `Gain +1 ${target}` });
const fishing = (): PetEffect => ({ kind: "FLAT_STAT", target: "FISHING_SPEED", valueTemplate: "1", rawText: "Gain +1 Fishing Speed" });

test("Mining mutation family excludes unrelated pets without pet-name allowlists", () => {
  const mine = definition("UNKNOWN_A;4", "legendary", mining("MINING_SPEED"));
  const fish = definition("UNKNOWN_B;4", "legendary", fishing());
  const mutations = buildDomainPetMutations({ domain: "MINING", setups: [setup("mine", mine.id, mine.type), setup("fish", fish.id, fish.type)], definitions: [mine, fish] });
  assert.ok(mutations.some(value => value.sourceSetupId === "mine"));
  assert.equal(mutations.some(value => value.sourceSetupId === "fish"), false);
});

test("domain acquisition candidates come from semantic pet effects", () => {
  const owned = definition("OWNED;4", "legendary", mining("MINING_SPEED"));
  const candidate = definition("CANDIDATE;4", "legendary", mining("MINING_FORTUNE"));
  const fish = definition("FISH;4", "legendary", fishing());
  const mutations = buildDomainPetMutations({ domain: "MINING", setups: [setup("owned", owned.id, owned.type)], definitions: [owned, candidate, fish] });
  const acquisitions = mutations.filter(value => value.kind === "ACQUIRE");
  assert.deepEqual(acquisitions.map(value => value.after.canonicalPetId), [candidate.id]);
});

test("Mining-relevant held item can enter a Mining setup family", () => {
  const pet = definition("NEUTRAL;4", "legendary");
  const item: CanonicalPetItemDefinition = {
    itemId: "MINING_ITEM", effects: [mining("MINING_FORTUNE")], conditions: [], rawLore: ["Mining Fortune"],
    parseStatus: "FULL", confidence: "HIGH", source: "NEU",
  };
  // The concrete setup is relevant because its current held item supplies the Mining mechanic.
  const mutations = buildDomainPetMutations({ domain: "MINING", setups: [setup("one", pet.id, pet.type, item.itemId)], definitions: [pet], petItems: [item] });
  assert.ok(mutations.some(value => value.kind === "LEVEL_TARGET" && value.sourceSetupId === "one"));
});

test("unrelated held items are not emitted into Mining mutation families", () => {
  const pet = definition("MINER;4", "legendary", mining("MINING_SPEED"));
  const miningItem: CanonicalPetItemDefinition = { itemId: "MINING_ITEM", effects: [mining("MINING_FORTUNE")], conditions: [], rawLore: [], parseStatus: "FULL", confidence: "HIGH", source: "NEU" };
  const fishingItem: CanonicalPetItemDefinition = { itemId: "FISH_ITEM", effects: [fishing()], conditions: [], rawLore: [], parseStatus: "FULL", confidence: "HIGH", source: "NEU" };
  const mutations = buildDomainPetMutations({ domain: "MINING", setups: [setup("one", pet.id, pet.type)], definitions: [pet], petItems: [miningItem, fishingItem] });
  const swaps = mutations.filter(value => value.kind === "CHANGE_HELD_ITEM");
  assert.deepEqual(swaps.map(value => value.after.heldItem), [miningItem.itemId]);
});
