import assert from "node:assert/strict";
import test from "node:test";
import { routeAdvisorQuestion } from "../src/server/advisor/routing";
import { buildProfileIntelligence } from "../src/server/advisor/profile-intelligence";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

test("routes explicit Foraging questions into the Foraging domain", () => {
  const route = routeAdvisorQuestion({ question: "What should I do next for HOTF and foraging?", profile: { progression: { dungeons: { selectedClass: null } } } as never });
  assert.equal(route.domain, "FORAGING");
  assert.equal(route.scope, "FORAGING");
  assert.equal(route.goal, "FORAGING");
  assert.deepEqual(route.activeDomains, ["FORAGING"]);
});

test("builds Foraging intelligence from normalized profile evidence", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const context = buildProfileIntelligence(profile).domains.FORAGING;
  assert.equal(context.domain, "FORAGING");
  if (context.domain !== "FORAGING") return;
  assert.equal(context.hotfLevel, 1);
  assert.equal(context.activePreset, null);
  assert.deepEqual(context.nodes, {});
  assert.equal(context.presets.foraging.nodes.sweep.level, 4);
  assert.equal(context.presets.foraging.nodes.foraging_fortune.level, 6);
  assert.deepEqual(context.relevantAttributes, {});
  assert.ok(Object.keys(context.collections).every(key => ["FIG_LOG", "MANGROVE_LOG", "HELIX_LOG", "HONEYCOMB", "RUBY_VEILSHROOM", "TENDER_WOOD"].includes(key)));
  assert.ok(context.unavailableFacts.some(fact => fact.includes("Effective Sweep")));
});
