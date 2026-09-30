import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { inspectFarmingMechanics } from "../src/server/farming/mechanics-inspection";
import { buildObservedFarmingState } from "../src/server/farming/observed-state";
import { fixtureSources } from "./fixtures/profile";

test("Farming inspection limits contest records and keeps pest history distinct from active pests", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.otherProgression.jacobsContest = { contests: { "2026:1_1:WHEAT": { collected: 123, medal: "GOLD", secret: { text: "private" } } },
    medals_inv: { gold: 2 }, perks: { double_drops: 3 } };
  profile.playerStats.kills.pest_fly = 4;
  profile.playerStats.kills.endermite = 700;
  const value = inspectFarmingMechanics(profile);
  assert.equal(value.contests.count, 1);
  assert.deepEqual(value.contests.sampleShapes[0].fields, ["collected", "medal", "secret"]);
  assert.equal(value.contests.sampleShapes[0].crop, "WHEAT");
  assert.equal(value.contests.medalInventory.gold, 2);
  assert.deepEqual(value.pestHistory.killStats, { pest_fly: 4 });
  const context = buildObservedFarmingState(profile);
  assert.equal(context.contestCount, 1);
  assert.deepEqual(context.observedPestKills, { pest_fly: 4 });
  assert.ok(!JSON.stringify(value).includes("private"));
});
