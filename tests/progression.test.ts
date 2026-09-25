import assert from "node:assert/strict";
import test from "node:test";
import tables from "../src/server/reference/xp-tables.json";
import { hotmLevelFromXp, levelFromXp } from "../src/server/reference/leveling";
import { getPetLevel, effectivePetRarity } from "../src/server/reference/pet-leveling";
import { slayerLevel, slayerThresholds, buildSlayers } from "../src/server/skyblock/domains/slayers";
import { buildSkills } from "../src/server/skyblock/domains/skills";
import { buildDungeons } from "../src/server/skyblock/domains/dungeons";
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
});

test("an absent pet identifier may be null without discarding owned pet data", () => {
  const member = memberSchema.parse({ pets_data: { pets: [{ uuid: null, type: "SHEEP", tier: "COMMON", exp: 100 }] } });
  const pet = buildPets(member, []).owned[0];
  assert.equal(pet.uuid, null); assert.equal(pet.level, 2);
});
