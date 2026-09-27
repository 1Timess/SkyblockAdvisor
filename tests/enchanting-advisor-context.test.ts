import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { buildEnchantingAdvisorContext } from "../src/server/enchanting/advisor-context";
import { fixtureSources } from "./fixtures/profile";

test("Enchanting route exposes only named reward and visible item evidence", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const input = { ...profile, progression: { ...profile.progression, skills: { ...profile.progression.skills,
    enchanting: { ...profile.progression.skills.enchanting, xp: 1_965_761, level: 23 } } } };
  const context = buildEnchantingAdvisorContext(input, "Is Growth VII worth getting from enchanting?");
  assert.equal(context.domain, "ENCHANTING");
  if (context.domain !== "ENCHANTING") throw new Error("unreachable");
  assert.equal(context.enchantingLevel, 23);
  assert.equal(context.xpActivity, true);
  assert.deepEqual(context.matchedRewards.map(reward => [reward.name, reward.access]), [["Growth VII", "TIER_LOCKED"]]);
  assert.equal(context.possibleRewardCount, 48);
  assert.deepEqual(buildEnchantingAdvisorContext(input, "How do I level enchanting?").domain, "ENCHANTING");
});
