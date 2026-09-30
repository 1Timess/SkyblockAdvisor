import assert from "node:assert/strict";
import test from "node:test";
import { buildCarpentryAdvisorContext, carpentryXpFromIngredientNpcValue } from "../src/server/carpentry/advisor-context";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureMember, fixtureSources } from "./fixtures/profile";

test("Carpentry XP formula uses 3% of eligible ingredient NPC sell value", () => {
  assert.equal(carpentryXpFromIngredientNpcValue(10_000), 300);
});

test("Carpentry context preserves unknown skill state", async () => {
  const member = fixtureMember();
  delete member.player_data!.experience!.SKILL_CARPENTRY;
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildCarpentryAdvisorContext(profile);
  assert.equal(context.domain, "CARPENTRY");
  if (context.domain !== "CARPENTRY") throw new Error("unreachable");
  assert.equal(context.skill.level, null);
  assert.equal(context.skill.xp, null);
  assert.equal(context.skill.xpTo50, null);
  assert.equal(context.quickCrafting.levelStatus, "UNKNOWN");
  assert.equal(context.progressionFocus.actions[0]?.kind, "INVESTIGATE");
});

test("Carpentry context exposes current mechanics without inventing a best craft", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_CARPENTRY = 0;
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildCarpentryAdvisorContext(profile);
  assert.equal(context.domain, "CARPENTRY");
  if (context.domain !== "CARPENTRY") throw new Error("unreachable");
  assert.equal(context.skill.level, 0);
  assert.equal(context.skill.cap, 50);
  assert.equal(context.mechanics.xpRateFromIngredientNpcSellValue, 0.03);
  assert.equal(context.mechanics.requiresThreeByThreeCrafting, true);
  assert.equal(context.mechanics.inventoryTwoByTwoAwardsXp, false);
  assert.equal(context.quickCrafting.carpentryLevelRequired, 3);
  assert.equal(context.quickCrafting.levelStatus, "LEVEL_LOCKED");
  assert.equal(context.furniture.finalRecipeUnlockLevel, 25);
  assert.deepEqual(context.levelingMethods, []);
  assert.equal(context.progressionFocus.actions[0]?.kind, "LEVEL_CARPENTRY");
});

test("Carpentry 50 stops skill-level progression", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_CARPENTRY = 55_172_425;
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildCarpentryAdvisorContext(profile);
  assert.equal(context.domain, "CARPENTRY");
  if (context.domain !== "CARPENTRY") throw new Error("unreachable");
  assert.equal(context.skill.level, 50);
  assert.equal(context.skill.xpTo50, 0);
  assert.equal(context.quickCrafting.levelStatus, "LEVEL_MET");
  assert.equal(context.progressionFocus.actions[0]?.kind, "HOLD");
});
