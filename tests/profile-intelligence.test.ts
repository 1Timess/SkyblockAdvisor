import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { AdvisorProfileSnapshotCache, buildProfileIntelligence, enrichActivityPetDomainContext } from "../src/server/advisor/profile-intelligence";
import type { CanonicalPetDefinition, PetEffect } from "../src/schemas/pet-mechanics";
import type { OwnedPetSetup } from "../src/schemas/owned-pet-setup";
import { buildActivityDomainLanes } from "../src/server/candidates/domain";
import type { CandidateItem } from "../src/schemas/catalog";
import { fixtureSources } from "./fixtures/profile";

test("one normalized profile derives all profile-intelligence domains", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const intelligence = buildProfileIntelligence(profile);
  assert.deepEqual(Object.keys(intelligence.domains), ["FARMING", "SLAYER", "COLLECTIONS", "DUNGEONS", "ACCESSORIES", "FISHING", "MINING", "FORAGING", "ALCHEMY", "CARPENTRY", "RUNECRAFTING", "ENCHANTING"]);
  assert.equal(intelligence.domains.ENCHANTING.domain, "ENCHANTING");
  assert.equal(intelligence.domains.DUNGEONS.domain, "DUNGEONS");
  assert.equal(intelligence.domains.ACCESSORIES.domain, "ACCESSORIES");
  assert.equal(intelligence.domains.FISHING.domain, "FISHING");
  assert.equal(intelligence.domains.MINING.domain, "MINING");
  if (intelligence.domains.MINING.domain !== "MINING") throw new Error("unreachable");
  assert.equal(intelligence.domains.MINING.hotmLevel, 2);
  assert.equal(intelligence.domains.MINING.treeExperience, 4242);
  assert.equal(intelligence.domains.MINING.mithrilPowder, 12345);
  assert.equal(intelligence.domains.MINING.gemstonePowder, 6789);
  assert.equal(intelligence.domains.MINING.nodes.mining_speed.level, 12);
  assert.equal(intelligence.domains.MINING.crystalHollows.available, true);
  assert.equal(intelligence.domains.MINING.crystalHollows.crystals.jade.state, "FOUND");
  assert.deepEqual(intelligence.domains.MINING.crystalHollows.nucleus.missing, ["amber", "topaz"]);
  assert.equal(intelligence.domains.MINING.crystalHollows.nucleus.ready, false);
  assert.equal(intelligence.domains.MINING.glacitePowder, 4321);
  assert.equal(intelligence.domains.MINING.glaciteTunnels.available, true);
  assert.equal(intelligence.domains.MINING.glaciteTunnels.mineshaftsEntered, 19);
  assert.equal(intelligence.domains.MINING.glaciteTunnels.totalCorpsesLooted, 18);
  assert.deepEqual(intelligence.domains.MINING.glaciteTunnels.fossilsDonated, ["CLUBBED", "UGLY"]);
  assert.equal(intelligence.domains.MINING.glaciteTunnels.coldResistance, 24);
  assert.equal(intelligence.domains.MINING.miningKnowledge.stage, "GLACITE_TUNNELS");
  assert.equal(intelligence.domains.MINING.miningKnowledge.access.crystalHollowsHotmRequirement, 4);
  assert.equal(intelligence.domains.MINING.miningKnowledge.access.glaciteTunnelsHotmRequirement, 7);
  assert.equal(intelligence.domains.MINING.miningKnowledge.activity.glaciteTunnels, true);
  assert.ok(intelligence.domains.MINING.armor.some(item => item.id === "LOADOUT_MINING_HELMET"));
  assert.ok(intelligence.domains.MINING.equipment.some(item => item.id === "LOADOUT_MINING_GLOVES"));
  assert.deepEqual(intelligence.domains.MINING.miningKnowledge.relevantStats,
    ["miningSpeed", "miningFortune", "gemstoneFortune", "pristine", "coldResistance"]);
  assert.ok(!intelligence.domains.MINING.unavailableFacts.some(fact => fact.includes("XP table")));
  if (intelligence.domains.FISHING.domain !== "FISHING") throw new Error("unreachable");
  assert.deepEqual(intelligence.domains.FISHING.itemsFished, { total: 321, normal: 300 });
  assert.equal(intelligence.domains.FISHING.seaCreatureKills, 45);
  if (intelligence.domains.ACCESSORIES.domain !== "ACCESSORIES") throw new Error("unreachable");
  assert.equal(intelligence.domains.ACCESSORIES.tuning.slots.slot_0.strength, 5);
});

test("snapshot cache reuses the normalized profile across domain questions", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const cache = new AdvisorProfileSnapshotCache(300);
  let loads = 0;
  const loader = async () => { loads++; return profile; };
  const first = await cache.getOrLoad({ usernameOrUuid: "FixturePlayer", requestedProfile: "Apple" }, loader);
  const second = await cache.getOrLoad({ usernameOrUuid: "FixturePlayer", requestedProfile: "Apple", profileSnapshotId: first.snapshot.snapshotId }, loader);
  assert.equal(first.cacheReused, false);
  assert.equal(second.cacheReused, true);
  assert.equal(second.snapshot, first.snapshot);
  assert.equal(loads, 1);
});

test("fishing and mining discovery stays inside repo-supported category and stat boundaries", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const item = (id: string, categories: string[], stats: Record<string, number>): CandidateItem => ({ id, name: id, rarity: "rare", categories,
    stats, lore: [], abilityText: [], setBonusText: [], requirements: [], unparsedRequirementText: [], wiki: null, marketKey: id,
    sources: { hypixel: true, neu: true } });
  const catalog = [item("ROD", ["weapon", "fishing_rod"], { fishingSpeed: 10 }), item("DRILL", ["tool", "drill"], { miningSpeed: 300 }),
    item("GEM_DRILL", ["tool", "drill"], { gemstoneFortune: 60, pristine: 1 }), item("COLD_HELMET", ["armor", "helmet"], { coldResistance: 8 }),
    item("SWORD_WITH_FISHING_STAT", ["weapon", "sword"], { fishingSpeed: 999 }), item("HELMET_WITH_MINING_STAT", ["armor", "helmet"], { miningFortune: 5 })];
  const fishing = buildActivityDomainLanes({ domain: "FISHING", profile, catalog, quotes: new Map() });
  const mining = buildActivityDomainLanes({ domain: "MINING", profile, catalog, quotes: new Map() });
  assert.deepEqual(fishing.fishingSpeed.map(candidate => candidate.id), ["ROD"]);
  assert.deepEqual(new Set(Object.values(mining).flat().map(candidate => candidate.id)),
    new Set(["DRILL", "GEM_DRILL", "COLD_HELMET"]));
  assert.equal(mining.miningSpeed.find(candidate => candidate.id === "DRILL")?.knownChanges?.miningSpeed.current, 250);
  assert.ok(!mining.miningFortune.some(candidate => candidate.id === "HELMET_WITH_MINING_STAT"));
});


test("semantic activity pet context cannot claim pet effects are unavailable when relevant pet progression exists", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const intelligence = buildProfileIntelligence(profile);
  const effect: PetEffect = { kind: "FLAT_STAT", target: "MINING_SPEED", valueTemplate: "1", rawText: "Gain +1 Mining Speed" };
  const definition: CanonicalPetDefinition = {
    id: "SHEEP;0", type: "SHEEP", rarity: "common", petSkillType: null, maxLevel: 100, rarityOffset: 0, xpCurve: [], xpMultiplier: 1,
    customLevelingType: null, baseStatTemplates: {},
    abilities: [{ name: "Synthetic mining mechanic", rawLore: [effect.rawText], effects: [effect], conditions: [], parseStatus: "FULL", confidence: "HIGH" }],
    upgradePaths: [], source: "NEU",
  };
  const setup: OwnedPetSetup = {
    setupId: "fixture-sheep", uuid: null, type: "SHEEP", name: "Sheep", baseRarity: "common", effectiveRarity: "common",
    xp: 0, level: 1, maxLevel: 100, xpCurrent: 0, xpForNext: 1, progress: 0, heldItem: null, candyUsed: 0, skin: null, active: true,
    canonicalPetId: definition.id, canonicalPetItemId: null, resolution: { petDefinition: "RESOLVED", petItemDefinition: "NONE" },
  };
  const context = enrichActivityPetDomainContext({
    context: intelligence.domains.MINING, profile, domain: "MINING", setups: [setup], definitions: [definition], petItems: [],
    hasRelevantPetCandidates: true,
  });
  assert.equal(context.domain, "MINING");
  if (context.domain !== "MINING") throw new Error("unreachable");
  assert.equal(context.pets.length, 1);
  assert.equal(context.pets[0].type, "SHEEP");
  assert.ok(!context.unavailableFacts.some(fact => fact.startsWith("Pet mining effects are unavailable")));
});
