import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { buildSkillProgressionSummaries } from "../src/server/skills/progression-summary";
import { fixtureMember, fixtureSources } from "./fixtures/profile";

test("skill summaries use domain-native mining and foraging progression state", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer", requestedTab: "skills" }, fixtureSources());
  const summaries = buildSkillProgressionSummaries(profile);

  assert.equal(summaries.mining.support, "DOMAIN_NATIVE");
  assert.equal(summaries.mining.facts.find(fact => fact.label === "Heart of the Mountain")?.value, profile.progression.mining.hotmLevel);
  assert.equal(summaries.foraging.support, "DOMAIN_NATIVE");
  assert.equal(summaries.foraging.facts.find(fact => fact.label === "Heart of the Forest")?.value, profile.progression.foraging.hotfLevel);
});

test("skill summaries do not invent a best mining tool when multiple relevant tools are visible", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer", requestedTab: "skills" }, fixtureSources());
  profile.inventoryItems.push({
    id: "SECOND_DRILL", uuid: "second-drill", name: "Second Drill", source: "inventory", count: 1, rarity: "rare",
    categories: ["tool", "drill"], stats: { miningSpeed: 300 }, reforge: null, enchantments: {}, stars: null,
    recombobulated: false, lore: [], abilityText: [], setBonusText: [],
  });
  const mining = buildSkillProgressionSummaries(profile).mining;
  assert.ok(mining.relevantItems.length >= 2);
  assert.equal(mining.primaryItem, null);
  assert.ok(mining.limitations.some(value => value.includes("no single best tool")));
});

test("combat summary prefers the observed equipped weapon rather than inventory order", async () => {
  const member = fixtureMember();
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer", requestedTab: "skills" }, fixtureSources(member));
  profile.gear.equippedWeapon = {
    id: "EQUIPPED_FIXTURE", uuid: "equipped-fixture", name: "Equipped Fixture", source: "inventory", count: 1, rarity: "rare",
    categories: ["weapon", "sword"], stats: { damage: 100 }, reforge: null, enchantments: {}, stars: null,
    recombobulated: false, lore: [], abilityText: [], setBonusText: [],
  };
  const combat = buildSkillProgressionSummaries(profile).combat;
  assert.equal(combat.support, "COMPOSED");
  assert.equal(combat.primaryItem?.id, "EQUIPPED_FIXTURE");
});


test("skill summaries accept canonical domain pet relevance instead of stat heuristics", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer", requestedTab: "skills" }, fixtureSources());
  const pet = profile.pets.owned[0];
  assert.ok(pet);
  const setup = {
    setupId: "pet:fixture", uuid: pet.uuid, type: pet.type, name: pet.name,
    baseRarity: pet.rarity, effectiveRarity: pet.effectiveRarity, xp: pet.xp, level: pet.level, maxLevel: pet.maxLevel,
    xpCurrent: pet.xpCurrent, xpForNext: pet.xpForNext, progress: pet.progress, heldItem: pet.heldItem,
    candyUsed: pet.candyUsed, skin: pet.skin, active: pet.active, canonicalPetId: "SHEEP;0", canonicalPetItemId: null,
    resolution: { petDefinition: "RESOLVED" as const, petItemDefinition: "NONE" as const },
  };
  const definition = {
    id: "SHEEP;0", type: "SHEEP", rarity: "common" as const, petSkillType: "COMBAT", maxLevel: 100, rarityOffset: 0,
    xpCurve: Array(99).fill(100), xpMultiplier: 1, customLevelingType: null, baseStatTemplates: { COMBAT_WISDOM: "{COMBAT_WISDOM}" },
    abilities: [], upgradePaths: [], source: "NEU" as const,
  };
  const summaries = buildSkillProgressionSummaries(profile, { setups: [setup], definitions: [definition], petItems: [] });
  assert.equal(summaries.combat.relevantOwnedPets.length, 1);
  assert.equal(summaries.mining.relevantOwnedPets.length, 0);
});


test("skill summaries preserve deterministic candidate lane evidence without selecting a global winner", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer", requestedTab: "skills" }, fixtureSources());
  const candidate = {
    id: "fixture-upgrade", domain: "tool" as const,
    item: { id: "FIXTURE_DRILL", name: "Fixture Drill", rarity: "rare" as const, categories: ["tool", "drill"],
      stats: { miningSpeed: 500 }, requirements: [], unparsedRequirementText: [], lore: [], abilityText: [], setBonusText: [],
      sources: { hypixel: true, neu: true }, marketKey: "FIXTURE_DRILL" },
    requirements: [], abilityText: [], setBonusText: [], warnings: [],
  };
  const summaries = buildSkillProgressionSummaries(profile, undefined, {
    mining: [{ lane: "mining:miningSpeed", candidate }],
  });
  assert.equal(summaries.mining.candidateEvidence.length, 1);
  assert.equal(summaries.mining.candidateEvidence[0].lane, "mining:miningSpeed");
  assert.equal(summaries.mining.candidateEvidence[0].candidate.id, "fixture-upgrade");
  assert.notEqual(summaries.mining.progressionFocus?.label, "Fixture Drill");
});


test("skill presentation only selects a pet when canonical relevance is unambiguous", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer", requestedTab: "skills" }, fixtureSources());
  const pet = profile.pets.owned[0];
  assert.ok(pet);
  const setup = {
    setupId: "pet:fixture", uuid: pet.uuid, type: pet.type, name: pet.name,
    baseRarity: pet.rarity, effectiveRarity: pet.effectiveRarity, xp: pet.xp, level: pet.level, maxLevel: pet.maxLevel,
    xpCurrent: pet.xpCurrent, xpForNext: pet.xpForNext, progress: pet.progress, heldItem: pet.heldItem,
    candyUsed: pet.candyUsed, skin: pet.skin, active: pet.active, canonicalPetId: "SHEEP;0", canonicalPetItemId: null,
    resolution: { petDefinition: "RESOLVED" as const, petItemDefinition: "NONE" as const },
  };
  const definition = {
    id: "SHEEP;0", type: "SHEEP", rarity: "common" as const, petSkillType: "COMBAT", maxLevel: 100, rarityOffset: 0,
    xpCurve: Array(99).fill(100), xpMultiplier: 1, customLevelingType: null, baseStatTemplates: { COMBAT_WISDOM: "{COMBAT_WISDOM}" },
    abilities: [], upgradePaths: [], source: "NEU" as const,
  };
  const combat = buildSkillProgressionSummaries(profile, { setups: [setup], definitions: [definition], petItems: [] }).combat;
  assert.equal(combat.displayPet?.uuid, pet.uuid);
});

test("farming summary preserves native Garden evidence without converting it into advisor candidates", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer", requestedTab: "skills" }, fixtureSources());
  const farming = buildSkillProgressionSummaries(profile, undefined, {}, { farming: { farming: {
    gardenAvailable: true, gardenLevel: 8, gardenXp: 12345,
    nextGardenLevel: { level: 9, xpRequired: 20000, xpRemaining: 7655 },
    nextCropMilestones: [{ crop: "WHEAT", resourceId: "WHEAT", collected: 900, tier: 4, threshold: 1000, remaining: 100 }],
    equipmentComparisons: [{ targetItemId: "FERMENTO_BOOTS" }],
  } } }).farming;
  assert.equal(farming.domainEvidence.farming?.gardenLevel, 8);
  assert.equal(farming.domainEvidence.farming?.nextCropMilestones[0]?.remaining, 100);
  assert.equal(farming.candidateEvidence.length, 0);
});
