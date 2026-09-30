import assert from "node:assert/strict";
import test from "node:test";
import { buildCarpentryAdvisorContext, carpentryXpFromIngredientNpcValue } from "../src/server/carpentry/advisor-context";
import type { MarketQuote } from "../src/schemas/market";
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
  assert.equal(context.levelingMethods.length, 3);
  assert.deepEqual(context.levelingMethods.map(method => [method.id, method.carpentryXpPerCraft]), [
    ["ENCHANTED_DIAMOND_BLOCK", 6144], ["ENCHANTED_SULPHUR_CUBE", 7680], ["ENCHANTED_COOKED_SALMON", 7680],
  ]);
  assert.ok(context.levelingMethods.every(method => method.acquisitionCostCoins === null));
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


test("Carpentry economics rank supported methods using live input cost and best recovery", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_CARPENTRY = 0;
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  profile.unlockedCollectionTiers.push("DIAMOND_8", "SULPHUR_6", "RAW_SALMON_8");
  const quote = (marketKey: string, coins: number): MarketQuote => ({ marketKey, coins, observedAt: "2026-09-30T00:00:00.000Z", basis: "BAZAAR", confidence: "HIGH" });
  const quotes = new Map<string, MarketQuote>([
    ["ENCHANTED_DIAMOND", quote("ENCHANTED_DIAMOND", 1300)], ["ENCHANTED_DIAMOND_BLOCK", quote("ENCHANTED_DIAMOND_BLOCK", 203000)],
    ["ENCHANTED_SULPHUR", quote("ENCHANTED_SULPHUR", 1500)], ["ENCHANTED_SULPHUR_CUBE", quote("ENCHANTED_SULPHUR_CUBE", 250000)],
    ["ENCHANTED_RAW_SALMON", quote("ENCHANTED_RAW_SALMON", 1700)], ["ENCHANTED_COOKED_SALMON", quote("ENCHANTED_COOKED_SALMON", 250000)],
  ]);
  const context = buildCarpentryAdvisorContext(profile, quotes, 50_000_000);
  assert.equal(context.domain, "CARPENTRY"); if (context.domain !== "CARPENTRY") throw new Error("unreachable");
  const sulphur = context.levelingMethods.find(method => method.id === "ENCHANTED_SULPHUR_CUBE")!;
  assert.equal(sulphur.acquisitionCostCoins, 240000);
  assert.equal(sulphur.bestObservedRecoveryValueCoins, 256000);
  assert.equal(sulphur.effectiveCostCoins, -16000);
  assert.equal(sulphur.effectiveCoinsPerXp, -16000 / 7680);
  assert.equal(sulphur.requirementStatus, "AVAILABLE");
  assert.equal(context.progressionFocus.actions[0]?.title, "Level Carpentry with Enchanted Sulphur Cube");
});

test("Carpentry collection gates stay UNKNOWN when collection evidence is absent", async () => {
  const member = fixtureMember(); member.player_data!.experience!.SKILL_CARPENTRY = 0;
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  profile.unlockedCollectionTiers = [];
  const context = buildCarpentryAdvisorContext(profile);
  assert.equal(context.domain, "CARPENTRY"); if (context.domain !== "CARPENTRY") throw new Error("unreachable");
  assert.ok(context.levelingMethods.every(method => method.requirementStatus === "UNKNOWN"));
});


test("Carpentry primary recommendation requires AVAILABLE recipe evidence", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_CARPENTRY = 0;
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  profile.unlockedCollectionTiers = ["DIAMOND_8"];
  const quote = (marketKey: string, coins: number): MarketQuote => ({ marketKey, coins, observedAt: "2026-09-30T00:00:00.000Z", basis: "BAZAAR", confidence: "HIGH" });
  const quotes = new Map<string, MarketQuote>([
    ["ENCHANTED_DIAMOND", quote("ENCHANTED_DIAMOND", 1300)],
    ["ENCHANTED_DIAMOND_BLOCK", quote("ENCHANTED_DIAMOND_BLOCK", 204800)],
    ["ENCHANTED_RAW_SALMON", quote("ENCHANTED_RAW_SALMON", 1400)],
    ["ENCHANTED_COOKED_SALMON", quote("ENCHANTED_COOKED_SALMON", 256000)],
  ]);
  const context = buildCarpentryAdvisorContext(profile, quotes, 50_000_000);
  assert.equal(context.domain, "CARPENTRY");
  if (context.domain !== "CARPENTRY") throw new Error("unreachable");
  assert.equal(context.levelingMethods.find(method => method.id === "ENCHANTED_COOKED_SALMON")?.requirementStatus, "UNKNOWN");
  assert.equal(context.progressionFocus.actions[0]?.title, "Level Carpentry with Enchanted Diamond Block");
});
