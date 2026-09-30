import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePetDomainRelevance } from "../src/server/pets/domain-relevance";
import type { CanonicalPetDefinition, PetEffect } from "../src/schemas/pet-mechanics";

function definition(id: string, target: string, rawText: string): CanonicalPetDefinition {
  const effect = { kind: "FLAT_STAT", target, valueTemplate: "1", rawText } as PetEffect;
  return {
    id, type: id.split(";")[0], rarity: "common", petSkillType: null, maxLevel: 100, rarityOffset: 0,
    xpCurve: [], xpMultiplier: 1, customLevelingType: null, baseStatTemplates: {},
    abilities: [{ name: "Fixture", rawLore: [rawText], effects: [effect], conditions: [], parseStatus: "FULL", confidence: "HIGH" }],
    upgradePaths: [], source: "NEU",
  };
}

test("Foraging pet relevance accepts Foraging mechanics and rejects Mining-only mechanics", () => {
  const foraging = evaluatePetDomainRelevance(definition("FROG;0", "FORAGING_FORTUNE", "Gain +1 Foraging Fortune"), "FORAGING");
  const mining = evaluatePetDomainRelevance(definition("MITHRIL_GOLEM;0", "MINING_SPEED", "Gain +1 Mining Speed"), "FORAGING");
  assert.equal(foraging.relevant, true);
  assert.ok(foraging.evidence.some(value => value.source === "PET_EFFECT" && value.mechanic === "FORAGING_FORTUNE"));
  assert.equal(mining.relevant, false);
  assert.ok(!mining.evidence.some(value => value.source === "PET_EFFECT"));
});


test("Foraging pet relevance accepts canonical base Sweep without name-based pet logic", () => {
  const baseSweep = definition("UNLISTED_FOREST_PET;0", "MINING_SPEED", "Gain +1 Mining Speed");
  baseSweep.abilities = [];
  baseSweep.baseStatTemplates = { SWEEP: "10" };
  const result = evaluatePetDomainRelevance(baseSweep, "FORAGING");
  assert.equal(result.relevant, true);
  assert.ok(result.evidence.some(value => value.source === "PET_BASE_STAT" && value.mechanic === "SWEEP"));
});
