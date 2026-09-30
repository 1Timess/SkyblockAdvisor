import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { buildAlchemyAdvisorContext } from "../src/server/alchemy/advisor-context";
import { godPotionDurationHours, potionFocusForQuestion } from "../src/server/alchemy/reference";
import { buildAlchemyWisdomState } from "../src/server/alchemy/wisdom";
import { alchemyLevelingMethods, effectiveAlchemyXp } from "../src/server/alchemy/leveling";
import { encodeInventory, fixtureMember, fixtureSources } from "./fixtures/profile";

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
  assert.equal(context.potionCatalog.recipeCoverage, "PARTIAL_VERIFIED");
  const haste = context.potionCatalog.focus.find(entry => entry.name === "Haste");
  assert.equal(haste?.recipeStatus, "VERIFIED");
  assert.ok(haste?.recipes.some(recipe => recipe.ingredientId === "COAL" && recipe.resultingLevel === 1));
  assert.equal(context.godPotion.mixinCount, 13);
  assert.equal(context.godPotion.mixins.length, 13);
  assert.ok(context.brewing.modifierRules.skillXpBoostRules.some(rule => rule.includes("Redstone Dust")));
  assert.equal(context.brewing.modifierRules.ordinaryPotionParrotDurationBonusMaxPercent, 40);
  assert.ok(context.godPotion.effects.some(effect => effect.name === "Alchemy XP Boost" && effect.level === 3));
  assert.equal(context.potionCatalog.focus.find(entry => entry.name === "Haste")?.unlockStatus, "UNKNOWN");
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
  assert.equal(mining.find(entry => entry.name === "Spelunker")?.maxLevel, 4);
  assert.deepEqual(potionFocusForQuestion("How do I brew Critical?").map(entry => entry.name), ["Critical"]);
  assert.ok(Math.abs((godPotionDurationHours(50, 20) ?? 0) - 28.8) < 1e-9);
});


test("Alchemy Wisdom only counts profile evidence that is actually observable", async () => {
  const member = fixtureMember();
  member.slayer!.slayer_bosses!.spider = { xp: 400_000 };
  member.pets_data!.pets = [{
    uuid: "witch-fixture", type: "WITCH", exp: 0, active: true, tier: "EPIC", heldItem: null, candyUsed: 0, skin: null,
  }];
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const wisdom = buildAlchemyWisdomState(profile);
  assert.equal(wisdom.sources.find(source => source.id === "SPIDER_SLAYER_8")?.status, "ACTIVE");
  assert.equal(wisdom.witch.active, true);
  assert.equal(wisdom.witch.rarity, "epic");
  assert.ok((wisdom.witch.brewSeconds ?? 20) < 20);
  assert.equal(wisdom.sources.find(source => source.id === "BOOSTER_COOKIE")?.status, "UNREPORTED");
  assert.equal(wisdom.effectiveWisdomStatus, "PARTIAL");
});

test("Alchemy leveling methods retain base XP and apply only confirmed Wisdom to the floor", () => {
  assert.equal(alchemyLevelingMethods.find(method => method.marketKey === "ENCHANTED_SUGAR_CANE")?.xpPerBatch, 45_000);
  assert.equal(alchemyLevelingMethods.find(method => method.marketKey === "ENCHANTED_BLAZE_ROD")?.xpPerBatch, 69_000);
  assert.equal(effectiveAlchemyXp(45_000, 30), 58_500);
  assert.equal(effectiveAlchemyXp(45_000, 30, 1.5), 87_750);
});


test("Alchemy method economics use supplied market evidence without inventing recovery value", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_ALCHEMY = 0;
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const quotes = new Map([["ENCHANTED_SUGAR_CANE", {
    marketKey: "ENCHANTED_SUGAR_CANE", coins: 90_000, observedAt: new Date(0).toISOString(),
    basis: "BAZAAR" as const, confidence: "HIGH" as const,
  }]]);
  const context = buildAlchemyAdvisorContext(profile, "What is the fastest way to level Alchemy?", quotes);
  assert.equal(context.domain, "ALCHEMY");
  if (context.domain !== "ALCHEMY") throw new Error("unreachable");
  const cane = context.levelingMethods.find(method => method.marketKey === "ENCHANTED_SUGAR_CANE");
  assert.equal(cane?.ingredientPriceCoins, 90_000);
  assert.equal(cane?.grossCoinsPerXpFloor, 2);
  const eye = context.levelingMethods.find(method => method.marketKey === "ENCHANTED_FERMENTED_SPIDER_EYE");
  assert.equal(eye?.ingredientPriceCoins, null);
  assert.equal(eye?.grossCoinsPerXpFloor, null);
});


test("verified potion recipes and compatible Brews are attached to focused potion advice", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const speedContext = buildAlchemyAdvisorContext(profile, "How do I brew Speed?");
  assert.equal(speedContext.domain, "ALCHEMY");
  if (speedContext.domain !== "ALCHEMY") throw new Error("unreachable");
  const speed = speedContext.potionCatalog.focus.find(entry => entry.name === "Speed");
  assert.equal(speed?.recipeStatus, "VERIFIED");
  assert.ok(speed?.recipes.some(recipe => recipe.ingredientId === "ENCHANTED_SUGAR_CANE" && recipe.resultingLevel === 5));
  assert.ok(speed?.compatibleBrews.some(brew => brew.name === "Cheap Coffee"));
  assert.ok(speed?.compatibleBrews.some(brew => brew.name === "Black Coffee"));
});

test("Potion Affinity remains separate from God Potion and splash duration", async () => {
  const member = fixtureMember();
  member.inventory!.bag_contents!.talisman_bag = { data: encodeInventory([
    { id: "ARTIFACT_POTION_AFFINITY", name: "Potion Affinity Artifact", lore: ["RARE ACCESSORY"] },
  ]) };
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildAlchemyAdvisorContext(profile, "How long do my potions last?");
  assert.equal(context.domain, "ALCHEMY");
  if (context.domain !== "ALCHEMY") throw new Error("unreachable");
  assert.equal(context.potionAffinity.observed?.durationBonusPercent, 50);
  assert.equal(context.potionAffinity.appliesToConsumedPotions, true);
  assert.equal(context.potionAffinity.appliesToSplashPotions, false);
  assert.equal(context.potionAffinity.appliesToGodPotion, false);
});


test("focused combat, archery, pet, and mining questions expose verified base recipes", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const cases = [
    ["How do I brew Critical?", "Critical", "FLINT"],
    ["How do I brew Archery?", "Archery", "FEATHER"],
    ["How do I brew Pet Luck?", "Pet Luck", "ENCHANTED_RABBIT_HIDE"],
    ["How do I brew Spelunker?", "Spelunker", "MITHRIL_ORE"],
  ] as const;
  for (const [question, potionName, ingredientId] of cases) {
    const context = buildAlchemyAdvisorContext(profile, question);
    assert.equal(context.domain, "ALCHEMY");
    if (context.domain !== "ALCHEMY") throw new Error("unreachable");
    const potion = context.potionCatalog.focus.find(entry => entry.name === potionName);
    assert.equal(potion?.recipeStatus, "VERIFIED");
    assert.ok(potion?.recipes.some(recipe => recipe.ingredientId === ingredientId));
  }
});

test("God Potion Mixins evaluate Slayer requirements without claiming unobserved application state", async () => {
  const member = fixtureMember();
  member.slayer!.slayer_bosses!.zombie = { xp: 0 };
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildAlchemyAdvisorContext(profile, "Which God Potion mixins can I use?");
  assert.equal(context.domain, "ALCHEMY");
  if (context.domain !== "ALCHEMY") throw new Error("unreachable");
  assert.equal(context.godPotion.mixins.find(mixin => mixin.id === "ZOMBIE_BRAIN_MIXIN")?.requirementStatus, "LOCKED");
  assert.equal(context.godPotion.mixins.find(mixin => mixin.id === "MELON_JUICE_MIXIN")?.requirementStatus, "NO_REQUIREMENT");
  assert.ok(context.unavailableFacts.some(fact => fact.includes("Mixin timers")));
});
