import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { AdvisorProfileSnapshotCache, buildProfileIntelligence } from "../src/server/advisor/profile-intelligence";
import { buildActivityDomainLanes } from "../src/server/candidates/domain";
import type { CandidateItem } from "../src/schemas/catalog";
import { fixtureSources } from "./fixtures/profile";

test("one normalized profile derives all four profile-intelligence domains", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const intelligence = buildProfileIntelligence(profile);
  assert.deepEqual(Object.keys(intelligence.domains), ["DUNGEONS", "ACCESSORIES", "FISHING", "MINING"]);
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
  const catalog = [item("ROD", ["weapon", "fishing_rod"], { fishingSpeed: 10 }), item("DRILL", ["tool", "drill"], { miningSpeed: 100 }),
    item("SWORD_WITH_FISHING_STAT", ["weapon", "sword"], { fishingSpeed: 999 }), item("HELMET_WITH_MINING_STAT", ["armor", "helmet"], { miningFortune: 5 })];
  const fishing = buildActivityDomainLanes({ domain: "FISHING", profile, catalog, quotes: new Map() });
  const mining = buildActivityDomainLanes({ domain: "MINING", profile, catalog, quotes: new Map() });
  assert.deepEqual(fishing.fishingSpeed.map(candidate => candidate.id), ["ROD"]);
  assert.deepEqual(new Set(Object.values(mining).flat().map(candidate => candidate.id)), new Set(["DRILL", "HELMET_WITH_MINING_STAT"]));
});
