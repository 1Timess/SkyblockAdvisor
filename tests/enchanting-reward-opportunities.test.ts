import assert from "node:assert/strict";
import test from "node:test";
import { memberSchema } from "../src/server/hypixel/types";
import { buildOwnedEnchantingState } from "../src/server/enchanting/owned-state";
import { buildExperimentRewardOpportunities, selectExperimentRewardFocus } from "../src/server/enchanting/reward-opportunities";

const outlook = (xp?: number, experimentation?: unknown) => buildExperimentRewardOpportunities(
  buildOwnedEnchantingState(memberSchema.parse({
    ...(xp === undefined ? {} : { player_data: { experience: { SKILL_ENCHANTING: xp } } }),
    experimentation,
  })));

test("possible rewards use level access and retain unresolved tier floors", () => {
  const early = outlook(1_965_761, { pairings: { claims_0: 20 }, serums_drank: 3 });
  const byName = new Map([...early.progression, ...early.cosmetic].map(entry => [entry.reward.name, entry]));
  assert.equal(byName.get("Guardian Pet")?.access, "POSSIBLE_AT_LEVEL");
  assert.equal(byName.get("Metaphysical Serum")?.access, "TIER_LOCKED");
  assert.equal(byName.get("Metaphysical Serum")?.requiredEnchantingLevel, 25);
  assert.equal(byName.get("Growth VII")?.access, "TIER_LOCKED");
  assert.equal(byName.get("Growth VII")?.requiredEnchantingLevel, 30);
  assert.equal(byName.get("Growth VI")?.access, "TIER_UNVERIFIED");
  assert.equal(byName.get("Experiment the Fish")?.access, "TIER_LOCKED");
  assert.equal(byName.get("Nadeshiko Dye")?.access, "TIER_LOCKED");
  assert.ok(!early.progression.some(entry => entry.reward.kind === "DYE" || entry.reward.kind === "COSMETIC"));
});

test("focus selects XP progression and only explicitly requested item rewards", () => {
  const early = buildOwnedEnchantingState(memberSchema.parse({ player_data: { experience: { SKILL_ENCHANTING: 1_965_761 } } }));
  assert.deepEqual(selectExperimentRewardFocus(early), { enchantingXpActivity: true, matchedRewards: [] });
  const focus = selectExperimentRewardFocus(early, ["Growth VII", "nadeshiko dye", "growth vii", "Unknown"]);
  assert.deepEqual(focus.matchedRewards.map(entry => [entry.reward.name, entry.access, entry.itemFit]), [["Growth VII", "TIER_LOCKED", "UNVERIFIED"]]);
  const withGear = selectExperimentRewardFocus(early, ["Growth VII"], [
    { name: "Chestplate", enchantments: { growth: 6 } }, { name: "Boots", enchantments: { growth: 7 } },
  ]);
  assert.deepEqual(withGear.matchedRewards[0].lowerEnchantedItems, ["Chestplate"]);
  assert.equal(withGear.matchedRewards[0].itemFit, "LOWER_ENCHANT_VISIBLE");
  const late = buildOwnedEnchantingState(memberSchema.parse({ player_data: { experience: { SKILL_ENCHANTING: 347_627_429 } } }));
  assert.equal(selectExperimentRewardFocus(late).enchantingXpActivity, false);
});

test("max level does not imply owned rewards or meter progress", () => {
  const late = outlook(347_627_429, { serums_drank: 3, pairings: { claims_5: 200 } });
  assert.equal(late.progression.length, 48);
  assert.equal(late.cosmetic.length, 2);
  assert.equal(late.progression.find(entry => entry.reward.name === "Growth VII")?.access, "POSSIBLE_AT_LEVEL");
  assert.equal(late.progression.find(entry => entry.reward.name === "Metaphysical Serum")?.access, "POSSIBLE_AT_LEVEL");
  assert.equal(outlook().progression[0].access, "LEVEL_UNKNOWN");
  assert.equal(outlook(0).progression[0].access, "TABLE_LOCKED");
  assert.deepEqual(Object.keys(late.progression[0]).sort(), ["access", "requiredEnchantingLevel", "reward"]);
  assert.deepEqual(Object.keys(late.progression[0].reward).sort(), ["kind", "minimumStake", "minimumStakeSource", "name", "pool", "source"]);
});
