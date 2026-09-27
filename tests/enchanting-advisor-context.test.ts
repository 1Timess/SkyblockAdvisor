import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { buildEnchantingAdvisorContext } from "../src/server/enchanting/advisor-context";
import { fixtureMember, fixtureSources } from "./fixtures/profile";
import { buildOwnedEnchantingState } from "../src/server/enchanting/owned-state";

test("Enchanting route exposes only named reward and visible item evidence", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const input = { ...profile, progression: { ...profile.progression, skills: { ...profile.progression.skills,
    enchanting: { ...profile.progression.skills.enchanting, xp: 1_965_761, level: 23 } },
    enchanting: buildOwnedEnchantingState({ player_data: { experience: { SKILL_ENCHANTING: 1_965_761 } },
      experimentation: { pairings: { claims_0: 3, best_score_1: 8, bonus_clicks: 2 },
        simon: { attempts_0: 4, best_score_0: 12 }, numbers: { claims_1: 1 }, serums_drank: 3 } }) } };
  const context = buildEnchantingAdvisorContext(input, "Is Growth VII worth getting from enchanting?");
  assert.equal(context.domain, "ENCHANTING");
  if (context.domain !== "ENCHANTING") throw new Error("unreachable");
  assert.equal(context.enchantingLevel, 23);
  assert.equal(context.xpActivity, true);
  assert.deepEqual(context.matchedRewards.map(reward => [reward.name, reward.access]), [["Growth VII", "TIER_LOCKED"]]);
  assert.equal(context.possibleRewardCount, 48);
  assert.equal(context.experimentation.history.superpairs.bonusClicks, 2);
  assert.deepEqual(context.experimentation.history.superpairs.claims, { "0": 3 });
  assert.deepEqual(buildEnchantingAdvisorContext(input, "How do I level enchanting?").domain, "ENCHANTING");
});

test("normalization carries observed Experimentation counters to advisor context", async () => {
  const member = { ...fixtureMember(), player_data: { experience: { SKILL_ENCHANTING: 1_965_761 } },
    experimentation: { simon: { attempts_0: 15, claims_0: 10, bonus_clicks: 2 },
      numbers: {}, pairings: { claims_0: 6, claims_1: 9, best_score_1: 3 } } };
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  assert.deepEqual(profile.progression.enchanting.experimentation.history.chronomatron.attempts, { "0": 15 });
  const context = buildEnchantingAdvisorContext(profile, "How do I progress with Superpairs?");
  if (context.domain !== "ENCHANTING") throw new Error("unreachable");
  assert.equal(context.experimentation.history.chronomatron.bonusClicks, 2);
  assert.deepEqual(context.experimentation.history.superpairs.claims, { "0": 6, "1": 9 });
  assert.equal(context.experimentation.history.superpairs.bonusClicks, null);
});
