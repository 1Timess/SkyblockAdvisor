import assert from "node:assert/strict";
import test from "node:test";
import { buildSlayerResearchCatalog, slayerRngSource } from "../src/server/slayer/research-catalog";
import { buildSlayers } from "../src/server/skyblock/domains/slayers";
import type { RawMember } from "../src/server/hypixel/types";

test("Slayer catalog keeps claims and possible RNG selections separate from observed XP", () => {
  const raw = { slayer: { slayer_bosses: {
    zombie: { xp: 603065, boss_kills_tier_4: 319, claimed_levels: { level_7_special: true, level_8_special: 123 } },
    blaze: { claimed_levels: {} },
  } } } as RawMember;
  const slayers = buildSlayers(raw, []);
  const catalog = buildSlayerResearchCatalog({ progression: { slayers } } as Parameters<typeof buildSlayerResearchCatalog>[0]);
  const zombie = catalog.find(family => family.id === "zombie")!;
  assert.equal(zombie.level, 8);
  assert.equal(zombie.nextLevel, 9);
  assert.equal(zombie.xpToNext, 396935);
  assert.deepEqual(zombie.claimedRewardKeys, ["level_7_special", "level_8_special"]);
  assert.equal(zombie.killsByTier["5"], 319);
  assert.ok(zombie.possibleRngRewards.some(option => option.neuId === "WARDEN_HEART"));
  const blaze = catalog.find(family => family.id === "blaze")!;
  assert.equal(blaze.status, "OBSERVED");
  assert.equal(blaze.xp, null);
  assert.equal(blaze.nextLevel, null);
  assert.equal(catalog.find(family => family.id === "vampire")!.status, "UNREPORTED");
  assert.equal(catalog.reduce((total, family) => total + family.possibleRngRewards.length, 0), 92);
  assert.equal(slayerRngSource.revision, "55e071b65ce75ad89dd1d1288eb213e818ddba20");
});
