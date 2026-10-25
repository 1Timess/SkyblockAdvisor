import assert from "node:assert/strict";
import test from "node:test";
import tables from "../src/server/reference/xp-tables.json";
import { hotmLevelFromXp, levelFromXp } from "../src/server/reference/leveling";
import { getPetLevel, effectivePetRarity } from "../src/server/reference/pet-leveling";
import { slayerLevel, slayerThresholds, buildSlayers } from "../src/server/skyblock/domains/slayers";
import { buildSkills } from "../src/server/skyblock/domains/skills";
import { buildDungeons, buildDungeonBossCollections, dungeonRngRewards } from "../src/server/skyblock/domains/dungeons";
import { buildPets } from "../src/server/skyblock/domains/pets";
import { fixtureMember } from "./fixtures/profile";
import { memberSchema } from "../src/server/hypixel/types";

test("skill exact and partial thresholds use incremental XP", () => {
  assert.equal(levelFromXp(175, tables.skill, 60).level, 2);
  assert.equal(levelFromXp(175, tables.skill, 60).progress, 0);
  assert.equal(levelFromXp(275, tables.skill, 60).progress, .5);
  const member = fixtureMember(); member.jacobs_contest = { perks: { farming_level_cap: 3 } };
  member.pets_data!.pet_care = { pet_types_sacrificed: ["SHEEP", "RABBIT"] };
  assert.equal(buildSkills(member, []).farming.maxLevel, 53);
  assert.equal(buildSkills(member, []).taming.maxLevel, 52);
  assert.equal(levelFromXp(1e9, tables.skill, 50).levelWithProgress, 50);
});
test("Catacombs continues beyond level 50 using the final cost", () => {
  const through51 = tables.dungeoneering.reduce((a, b) => a + b, 0);
  const level = levelFromXp(through51 + 300000000, tables.dungeoneering, 50, true);
  assert.equal(level.level, 52); assert.equal(level.progress, .5); assert.equal(level.maxed, false);
});
test("HOTM level uses the supplied cumulative thresholds", () => {
  const cases: Array<[number | null, number | null]> = [
    [null, null], [0, 1], [2_999, 1], [3_000, 2], [11_999, 2], [12_000, 3], [96_999, 4], [97_000, 5],
    [196_999, 5], [197_000, 6], [1_246_999, 9], [1_247_000, 10], [2_000_000, 10],
  ];
  for (const [xp, expected] of cases) assert.equal(hotmLevelFromXp(xp), expected, `XP ${xp}`);
  assert.equal(hotmLevelFromXp(undefined), null);
});
test("Slayer thresholds and kill tier normalization", () => {
  for (const thresholds of Object.values(slayerThresholds)) for (const [i, threshold] of thresholds.entries()) {
    assert.equal(slayerLevel(threshold - 1, thresholds), i); assert.equal(slayerLevel(threshold, thresholds), i + 1);
  }
  const result = buildSlayers(fixtureMember(), []).zombie;
  assert.equal(result.totalKills, 5); assert.equal(result.killsByTier["3"], 2);
});
test("pet offsets, custom dragons, Bingo and Tier Boost follow the supplied rules", () => {
  assert.equal(getPetLevel(100, "common", "SHEEP")?.level, 2);
  assert.equal(getPetLevel(155, "common", "SHEEP")?.progress, .5);
  assert.equal(getPetLevel(659, "legendary", "SHEEP")?.level, 1);
  assert.equal(getPetLevel(660, "legendary", "SHEEP")?.level, 2);
  assert.equal(getPetLevel(100, "legendary", "BINGO")?.level, 2);
  for (const dragon of ["GOLDEN_DRAGON", "JADE_DRAGON", "ROSE_DRAGON"]) {
    const start = getPetLevel(0, "legendary", dragon)!;
    assert.equal(start.maxLevel, 200);
    assert.equal(getPetLevel(start.experienceForMaxLevel, "legendary", dragon)?.level, 200);
  }
  assert.equal(effectivePetRarity("EPIC", "PET_ITEM_TIER_BOOST"), "legendary");
  assert.equal(effectivePetRarity("MYTHIC", "PET_ITEM_TIER_BOOST"), "mythic");
  const pet = buildPets(fixtureMember(), []).owned[0];
  assert.equal(pet.rarity, "common"); assert.equal(pet.effectiveRarity, "uncommon"); assert.equal(pet.level, 2);
  assert.equal(getPetLevel(100, "unknown", "SHEEP"), null);
});
test("dungeons preserve classes and normal/master completions", () => {
  const result = buildDungeons(fixtureMember(), []);
  assert.equal(result.catacombs?.level, 2); assert.equal(result.classes.archer.level, 1);
  assert.equal(result.highestFloorNormal, 5); assert.equal(result.highestFloorMaster, 1);
  assert.equal(result.floorCompletions.normal["5"], 2); assert.equal(result.secretsFound, 12);
  assert.equal(result.floorRecords.normal["5"].completions, 2);
  assert.equal(result.floorRecords.master["1"].completions, 1);
});

test("an absent pet identifier may be null without discarding owned pet data", () => {
  const member = memberSchema.parse({ pets_data: { pets: [{ uuid: null, type: "SHEEP", tier: "COMMON", exp: 100 }] } });
  const pet = buildPets(member, []).owned[0];
  assert.equal(pet.uuid, null); assert.equal(pet.level, 2);
});

test("boss collections combine observed normal and master completions and preserve unknown claims", () => {
  const result = buildDungeonBossCollections(
    { "1": 20, "4": 48, "7": 50 }, { "1": 5, "4": 2, "7": 0 },
  );
  assert.equal(result[0].name, "Bonzo");
  assert.equal(result[0].total, 30);
  assert.equal(result[0].tier, 1);
  assert.equal(result[0].nextMilestone, 50);
  assert.equal(result[0].progress, .6);
  assert.equal(result[3].name, "Thorn");
  assert.equal(result[3].tier, 1);
  assert.equal(result[6].tier, 1);
  assert.equal(result[1].total, null);
  assert.equal(result[1].tier, null);
  const maxed = buildDungeonBossCollections({ "1": 1000 })[0];
  assert.equal(maxed.tier, 6);
  assert.equal(maxed.nextMilestone, null);
});

test("dungeon boss milestones survive member normalization", () => {
  const member = memberSchema.parse({dungeons: {
    dungeon_types: {
      catacombs: { tier_completions: { "5": 48 } },
      master_catacombs: { tier_completions: { "5": 2 } },
    },
  }});
  const result = buildDungeons(member, []);
  assert.equal(result.bossCollections[4].name, "Livid");
  assert.equal(result.bossCollections[4].total, 52);
  assert.equal(result.bossCollections[4].tier, 1);
});

test("boss collection claims come from observed objectives tutorial flags only", () => {
  const member = memberSchema.parse({
    objectives: { tutorial: ["boss_collection_claimed_bonzo_gold", "boss_collection_claimed_necron_diamond"] },
    dungeons: { dungeon_types: { catacombs: { tier_completions: { "1": 100, "7": 1000 } } } },
  });
  const normalized = buildDungeons(member, []);
  assert.deepEqual(normalized.bossCollections[0].claimedFlags, ["boss_collection_claimed_bonzo_gold"]);
  assert.deepEqual(normalized.bossCollections[6].claimedFlags, ["boss_collection_claimed_necron_diamond"]);
  assert.deepEqual(normalized.bossCollections[1].claimedFlags, []);
});

test("NEU Dungeon RNG reference includes reward thresholds for normal and master floors", () => {
  for (const mode of ["normal","master"] as const) for (let floor=1;floor<=7;floor++) {
    const rewards = dungeonRngRewards(mode, String(floor));
    assert.ok(rewards.length > 0, `${mode} ${floor}`);
    assert.ok(rewards.every(reward => reward.requiredScore > 0));
  }
  assert.ok(dungeonRngRewards("normal","7").some(reward => reward.itemId === "NECRON_HANDLE"));
  assert.deepEqual(dungeonRngRewards("normal", "entrance"), []);
});
