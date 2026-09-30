import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { buildAlchemyAdvisorContext } from "../src/server/alchemy/advisor-context";
import { godPotionDurationHours, potionFocusForQuestion } from "../src/server/alchemy/reference";
import { fixtureMember, fixtureSources } from "./fixtures/profile";

test("Alchemy context preserves unknown skill evidence when Hypixel does not report XP", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const context = buildAlchemyAdvisorContext(profile, "What potion should I brew for mining?");
  assert.equal(context.domain, "ALCHEMY");
  if (context.domain !== "ALCHEMY") throw new Error("unreachable");
  assert.equal(context.skill.level, null);
  assert.equal(context.skill.xpTo50, null);
  assert.equal(context.godPotion.durationHours, null);
  assert.ok(context.potionCatalog.focus.some(entry => entry.name === "Haste"));
  assert.ok(context.potionCatalog.focus.some(entry => entry.name === "Spelunker"));
  assert.equal(context.potionCatalog.recipeCoverage, "UNRESOLVED");
});

test("Alchemy context derives level targets and God Potion duration from observed skill XP", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_ALCHEMY = 55_172_425;
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildAlchemyAdvisorContext(profile, "How long will my God Potion last?");
  assert.equal(context.domain, "ALCHEMY");
  if (context.domain !== "ALCHEMY") throw new Error("unreachable");
  assert.equal(context.skill.level, 50);
  assert.equal(context.skill.xpTo50, 0);
  assert.equal(context.skill.potionDurationBonusPercent, 50);
  assert.equal(context.godPotion.durationHours, 24);
});

test("potion focus is semantic and named potion questions stay narrow", () => {
  const mining = potionFocusForQuestion("What potion should I brew for mining?");
  assert.ok(mining.some(entry => entry.name === "Haste"));
  assert.ok(mining.some(entry => entry.name === "Spelunker"));
  assert.ok(mining.every(entry => entry.tags.includes("MINING")));
  assert.deepEqual(potionFocusForQuestion("How do I brew Critical?").map(entry => entry.name), ["Critical"]);
  assert.ok(Math.abs((godPotionDurationHours(50, 20) ?? 0) - 28.8) < 1e-9);
});
