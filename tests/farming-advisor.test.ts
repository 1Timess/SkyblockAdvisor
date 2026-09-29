import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { buildFarmingAdvisorContext } from "../src/server/farming/advisor-context";
import { advisorDomainContextSchema } from "../src/schemas/advisor";
import { fixtureSources } from "./fixtures/profile";

test("Farming context keeps distinct Garden thresholds and observed offers", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const value = buildFarmingAdvisorContext(profile, {
    garden_experience: 9330, greenhouse_slots: [], resources_collected: { WHEAT: 123 }, unlocked_plots_ids: ["beginner_1", "beginner_2"],
    commission_data: { total_completed: 98, unique_npcs_served: 46 },
    active_commissions: { tia: { status: "NOT_STARTED", requirement: [{ item: "ENCHANTED_CACTUS", amount: 2 }] } },
  });
  assert.equal(value.domain, "FARMING");
  if (value.domain !== "FARMING") return;
  assert.deepEqual(value.nextGardenLevel, { level: 10, xpRequired: 10120, xpRemaining: 790 });
  assert.deepEqual(value.unlockedPlotIds, ["beginner_1", "beginner_2"]);
  assert.deepEqual(value.nextGardenCropUnlocks, ["Nether Wart"]);
  assert.deepEqual(value.greenhouseSlotObservation, { status: "REPORTED", count: 0 });
  assert.equal(value.greenhouseEligibility, true);
  assert.equal(value.nextOffersMilestone?.remaining, 2);
  assert.equal(value.nextUniqueVisitorsMilestone?.remaining, 4);
  assert.deepEqual(value.activeOffers[0].requirements, [{ itemId: "ENCHANTED_CACTUS", amount: 2 }]);
  advisorDomainContextSchema.parse(value);
});

test("missing Garden response leaves counts unreported", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const value = buildFarmingAdvisorContext(profile, null);
  assert.equal(value.domain, "FARMING");
  if (value.domain !== "FARMING") return;
  assert.equal(value.gardenAvailable, false);
  assert.equal(value.totalOffersAccepted, null);
  assert.equal(value.nextGardenLevel, null);
  assert.deepEqual(value.greenhouseSlotObservation, { status: "UNREPORTED", count: null });
});

test("Lemon Garden level 10 identifies the next crop access without assuming greenhouse ownership", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const value = buildFarmingAdvisorContext(profile, { garden_experience: 12181, greenhouse_slots: [], unlocked_plots_ids: ["beginner_1"] });
  assert.equal(value.domain, "FARMING");
  if (value.domain !== "FARMING") return;
  assert.equal(value.nextGardenLevel?.level, 11);
  assert.deepEqual(value.nextGardenCropUnlocks, ["Sunflower", "Moonflower"]);
  assert.equal(value.greenhouseSlotObservation.count, 0);
});
