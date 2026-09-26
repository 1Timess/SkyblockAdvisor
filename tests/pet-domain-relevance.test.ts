import assert from "node:assert/strict";
import test from "node:test";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition } from "../src/schemas/pet-mechanics";
import { evaluatePetDomainRelevance } from "../src/server/pets/domain-relevance";

function pet(overrides: Partial<CanonicalPetDefinition> = {}): CanonicalPetDefinition {
  return {
    id: "TEST;4", type: "TEST", rarity: "legendary", petSkillType: null, maxLevel: 100,
    rarityOffset: 20, xpCurve: [], xpMultiplier: 1, customLevelingType: null, baseStatTemplates: {},
    abilities: [], upgradePaths: [], source: "NEU", ...overrides,
  };
}

test("Scatha-style mining stats produce semantic Mining relevance without pet ID knowledge", () => {
  const result = evaluatePetDomainRelevance(pet({
    id: "SOME_UNKNOWN_PET;4", type: "SOME_UNKNOWN_PET",
    abilities: [{
      name: "Drill Infusion", rawLore: ["Grants +{1} Gemstone Fortune to Drills."],
      effects: [{ kind: "FLAT_STAT", target: "GEMSTONE_FORTUNE", valueTemplate: "{1}", rawText: "Grants +{1} Gemstone Fortune to Drills." }],
      conditions: [{ kind: "EQUIPMENT_TYPE", value: "DRILLS", rawText: "Grants +{1} Gemstone Fortune to Drills." }],
      parseStatus: "FULL", confidence: "HIGH",
    }],
  }), "MINING");
  assert.equal(result.relevant, true);
  assert.ok(result.evidence.some(value => value.source === "PET_EFFECT" && value.mechanic === "GEMSTONE_FORTUNE"));
});

test("Bal-style Mining location condition contributes domain evidence", () => {
  const result = evaluatePetDomainRelevance(pet({
    abilities: [{
      name: "Furnace", rawLore: ["Grants +{0} Pristine while in the Magma Fields."],
      effects: [{ kind: "FLAT_STAT", target: "PRISTINE", valueTemplate: "{0}", rawText: "Grants +{0} Pristine while in the Magma Fields." }],
      conditions: [{ kind: "LOCATION", value: "Magma Fields", rawText: "Grants +{0} Pristine while in the Magma Fields." }],
      parseStatus: "PARTIAL", confidence: "MEDIUM",
    }],
  }), "MINING");
  assert.equal(result.relevant, true);
  assert.equal(result.confidence, "MEDIUM");
  assert.ok(result.evidence.some(value => value.source === "PET_CONDITION"));
});

test("held-item mechanics can make a concrete setup Mining relevant", () => {
  const item: CanonicalPetItemDefinition = {
    itemId: "PET_ITEM_TITANIUM_MINECART",
    effects: [{ kind: "FLAT_STAT", target: "MINING_FORTUNE", valueTemplate: "33.3", rawText: "Grants +33.3 Mining Fortune while mining Titanium Ore." }],
    conditions: [{ kind: "RESOURCE", value: "Titanium Ore", rawText: "Grants +33.3 Mining Fortune while mining Titanium Ore." }],
    rawLore: ["Grants +33.3 Mining Fortune while mining Titanium Ore."],
    parseStatus: "FULL", confidence: "HIGH", source: "NEU",
  };
  const result = evaluatePetDomainRelevance(pet(), "MINING", item);
  assert.equal(result.relevant, true);
  assert.ok(result.evidence.some(value => value.source === "PET_ITEM_EFFECT"));
});

test("Mining location alone does not make a Fishing mechanic Mining relevant", () => {
  const result = evaluatePetDomainRelevance(pet({
    petSkillType: "FISHING",
    abilities: [{
      name: "Expert Cave Fisher", rawLore: ["Gain +20 Fishing Speed while in the Crystal Hollows."],
      effects: [{ kind: "FLAT_STAT", target: "FISHING_SPEED", valueTemplate: "20", rawText: "Gain +20 Fishing Speed while in the Crystal Hollows." }],
      conditions: [{ kind: "LOCATION", value: "Crystal Hollows", rawText: "Gain +20 Fishing Speed while in the Crystal Hollows." }],
      parseStatus: "PARTIAL", confidence: "MEDIUM",
    }],
  }), "MINING");
  assert.equal(result.relevant, false);
  assert.ok(result.evidence.some(value => value.source === "PET_CONDITION"));
});

test("pet skill type alone is metadata and does not assert domain relevance", () => {
  const result = evaluatePetDomainRelevance(pet({ petSkillType: "MINING" }), "MINING");
  assert.equal(result.relevant, false);
  assert.deepEqual(result.evidence.map(value => value.source), ["PET_SKILL_TYPE"]);
});

test("combat-only mechanics do not leak into Mining", () => {
  const result = evaluatePetDomainRelevance(pet({
    petSkillType: "COMBAT",
    abilities: [{
      name: "Claws", rawLore: ["Gain +20 Strength."],
      effects: [{ kind: "FLAT_STAT", target: "STRENGTH", valueTemplate: "20", rawText: "Gain +20 Strength." }],
      conditions: [], parseStatus: "FULL", confidence: "HIGH",
    }],
  }), "MINING");
  assert.equal(result.relevant, false);
  assert.equal(result.evidence.length, 0);
});
