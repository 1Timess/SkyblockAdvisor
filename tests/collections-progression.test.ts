import assert from "node:assert/strict";
import test from "node:test";
import { buildCollectionProgress, buildCraftedMinions, parseCollectionDefinitions, selectCollectionFocus } from "../src/server/collections/progression";
import { routeAdvisorQuestion } from "../src/server/advisor/routing";
import { buildCollectionAdvisorContext } from "../src/server/collections/advisor-context";
import { advisorDomainContextSchema } from "../src/schemas/advisor";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

const definitions = parseCollectionDefinitions({ collections: { FARMING: { items: {
  WHEAT: { name: "Wheat", tiers: [
    { tier: 1, amountRequired: 50, unlocks: ["Wheat Minion I"] },
    { tier: 2, amountRequired: 100, unlocks: ["Enchanted Bread"] },
  ] },
  CARROT: { name: "Carrot", tiers: [{ tier: 1, amountRequired: 100, unlocks: [] }] },
} } } });

test("collection thresholds keep observed tier unlocks distinct from collection counts", () => {
  const progress = buildCollectionProgress({ collections: { WHEAT: 125, CARROT: 10 },
    unlockedCollectionTiers: ["WHEAT_1"], craftedGenerators: ["WHEAT_1", "WHEAT_3", "CARROT_1", "ODD_VALUE"] }, definitions);
  const wheat = progress.find(entry => entry.id === "WHEAT")!;
  assert.equal(wheat.unlockedTier, 1);
  assert.equal(wheat.nextTier?.tier, 2);
  assert.equal(wheat.remaining, 0);
  assert.equal(wheat.nextTierStatus, "REACHED_UNCONFIRMED");
  assert.deepEqual(wheat.craftedMinionTiers, [1, 3]);
  assert.deepEqual(selectCollectionFocus(progress, "What about my wheat minion?").map(entry => entry.id), ["WHEAT"]);
});

test("missing counts do not imply locked gates and malformed source tiers are ignored", () => {
  const parsed = parseCollectionDefinitions({ collections: { FARMING: { items: {
    WHEAT: { tiers: [{ tier: 1, amountRequired: "50" }, { tier: 2, amountRequired: 100 }] },
  } } } });
  assert.deepEqual(parsed[0].tiers.map(tier => tier.tier), [2]);
  const [progress] = buildCollectionProgress({ collections: {}, unlockedCollectionTiers: [], craftedGenerators: [] }, parsed);
  assert.equal(progress.nextTierStatus, "UNKNOWN");
  assert.equal(progress.remaining, null);
});

test("vanilla collection keys do not claim a matching crafted minion ID", () => {
  const parsed = parseCollectionDefinitions({ collections: { FARMING: { items: {
    "INK_SACK:3": { name: "Cocoa Beans", tiers: [{ tier: 1, amountRequired: 75, unlocks: ["Cocoa Beans Minion Recipes"] }] },
  } } } });
  const [progress] = buildCollectionProgress({ collections: { "INK_SACK:3": 75 },
    unlockedCollectionTiers: ["INK_SACK:3_1"], craftedGenerators: ["COCOA_1"] }, parsed);
  assert.equal(progress.unlockedTier, 1);
  assert.deepEqual(progress.craftedMinionTiers, []);
  assert.deepEqual(buildCraftedMinions(["COCOA_1"]), [{ id: "COCOA", name: "Cocoa", tiers: [1] }]);
});

test("collection and minion questions route to the collection domain", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  for (const question of ["Which collection should I work on?", "What minion should I craft?"]) {
    const route = routeAdvisorQuestion({ question, profile });
    assert.equal(route.domain, "COLLECTIONS");
    assert.equal(route.scope, "COLLECTIONS");
    assert.equal(route.clarificationRecommended, false);
  }
});

test("advisor context scopes sourced collection gates to the question", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const context = advisorDomainContextSchema.parse(buildCollectionAdvisorContext(profile, "Wheat minion progress", {
    version: "test", lastUpdated: 123, collections: { FARMING: { items: { WHEAT: {
      name: "Wheat", tiers: [{ tier: 1, amountRequired: 50, unlocks: ["Wheat Minion I"] }],
    } } } },
  }));
  assert.equal(context.domain, "COLLECTIONS");
  if (context.domain !== "COLLECTIONS") throw new Error("unreachable");
  assert.equal(context.focus.length, 1);
  assert.equal(context.focus[0].id, "WHEAT");
  assert.equal(context.sourceVersion, "test");
});
