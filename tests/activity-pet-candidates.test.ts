import assert from "node:assert/strict";
import test from "node:test";
import type { CandidateItem } from "../src/schemas/catalog";
import type { OwnedPetSetup } from "../src/schemas/owned-pet-setup";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition, PetEffect } from "../src/schemas/pet-mechanics";
import { buildActivityPetLanes } from "../src/server/candidates/activity-pets";

const mining: PetEffect = { kind: "FLAT_STAT", target: "MINING_SPEED", valueTemplate: "1", rawText: "Gain +1 Mining Speed" };
function definition(id: string): CanonicalPetDefinition {
  return { id, type: id.split(";")[0], rarity: "legendary", petSkillType: null, maxLevel: 100, rarityOffset: 0, xpCurve: [], xpMultiplier: 1,
    customLevelingType: null, baseStatTemplates: {}, abilities: [{ name: "Mine", rawLore: [mining.rawText], effects: [mining], conditions: [], parseStatus: "FULL", confidence: "HIGH" }],
    upgradePaths: [], source: "NEU" };
}
function setup(id: string, pet: CanonicalPetDefinition): OwnedPetSetup {
  return { setupId: id, uuid: id, type: pet.type, name: pet.type, baseRarity: "legendary", effectiveRarity: "legendary", xp: 0, level: 80, maxLevel: 100,
    xpCurrent: 0, xpForNext: 1, progress: 0, heldItem: null, candyUsed: 0, skin: null, active: false, canonicalPetId: pet.id,
    canonicalPetItemId: null, resolution: { petDefinition: "RESOLVED", petItemDefinition: "NONE" } };
}
function catalog(pet: CanonicalPetDefinition): CandidateItem {
  return { id: pet.id, name: pet.type, rarity: "legendary", categories: ["pet"], stats: {}, lore: [], abilityText: [], setBonusText: [],
    requirements: [], unparsedRequirementText: [], wiki: null, marketKey: `PET:${pet.type}:LEGENDARY`, sources: { hypixel: false, neu: true } };
}

test("activity pet lanes expose concrete semantic mutations and preserve acquisitions as one family", () => {
  const owned = definition("SEMANTIC_MINER;4");
  const unowned = definition("OTHER_MINER;4");
  const lanes = buildActivityPetLanes({ domain: "MINING", setups: [setup("owned", owned)], definitions: [owned, unowned], petItems: [], catalog: [catalog(owned), catalog(unowned)] });
  assert.ok(lanes.petLevelTarget?.some(candidate => candidate.item.id === owned.id));
  const acquisitions = lanes.petAcquisition ?? [];
  assert.equal(acquisitions.length, 1);
  assert.equal(acquisitions[0].petAcquisitionFamily?.petType, unowned.type);
  assert.deepEqual(acquisitions[0].petAcquisitionFamily?.members.map(member => member.canonicalPetId), [unowned.id]);
});

test("Mining activity integration is semantic rather than pet-name based", () => {
  const arbitrary = definition("TOTALLY_UNKNOWN_PET;4");
  const lanes = buildActivityPetLanes({ domain: "MINING", setups: [setup("one", arbitrary)], definitions: [arbitrary], petItems: [], catalog: [catalog(arbitrary)] });
  assert.equal(lanes.petLevelTarget?.[0]?.domain, "pet");
  assert.deepEqual(lanes.petLevelTarget?.[0]?.knownChanges?.petLevel, { current: 80, candidate: 100 });
});

test("domain-relevant held-item operations enter the activity lane", () => {
  const pet = definition("MINER;4");
  const item: CanonicalPetItemDefinition = { itemId: "MINING_ITEM", effects: [{ ...mining, target: "MINING_FORTUNE" }], conditions: [], rawLore: [],
    parseStatus: "FULL", confidence: "HIGH", source: "NEU" };
  const lanes = buildActivityPetLanes({ domain: "MINING", setups: [setup("one", pet)], definitions: [pet], petItems: [item], catalog: [catalog(pet)] });
  assert.ok(lanes.petHeldItem?.some(candidate => candidate.knownChanges?.petHeldItem?.candidate === 1));
});

test("activity adapter never fabricates a rarity-only pet acquisition price", () => {
  const pet = definition("MINER;4");
  const lanes = buildActivityPetLanes({ domain: "MINING", setups: [setup("one", pet)], definitions: [pet], petItems: [], catalog: [catalog(pet)] });
  assert.ok(Object.values(lanes).flat().every(candidate => candidate.price === undefined));
});


test("acquisition family retains every concrete rarity child without selecting one", () => {
  const owned = definition("OWNED_MINER;4");
  const rare = { ...definition("FAMILY_MINER;2"), rarity: "rare" } as CanonicalPetDefinition;
  const epic = { ...definition("FAMILY_MINER;3"), rarity: "epic" } as CanonicalPetDefinition;
  const legendary = definition("FAMILY_MINER;4");
  const lanes = buildActivityPetLanes({
    domain: "MINING", setups: [setup("owned", owned)],
    definitions: [owned, rare, epic, legendary], petItems: [],
    catalog: [catalog(owned), { ...catalog(rare), rarity: "rare" }, { ...catalog(epic), rarity: "epic" }, catalog(legendary)],
  });
  const family = lanes.petAcquisition?.find(candidate => candidate.petAcquisitionFamily?.petType === "FAMILY_MINER");
  assert.ok(family?.petAcquisitionFamily);
  assert.deepEqual(family.petAcquisitionFamily.members.map(member => member.canonicalPetId), ["FAMILY_MINER;2", "FAMILY_MINER;3", "FAMILY_MINER;4"]);
  assert.equal(family.price, undefined);
});
