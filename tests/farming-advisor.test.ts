import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { buildFarmingAdvisorContext } from "../src/server/farming/advisor-context";
import { nextCropMilestones } from "../src/server/farming/garden-progress";
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
  assert.deepEqual(value.nextPestUnlocks, [{ name: "Beetle", crop: "Nether Wart", gardenLevel: 10 }]);
  assert.equal(value.cropPestOptions[0]?.name, "Fly");
  assert.deepEqual(value.greenhouseExpansionOptions.map(option => option.greenhouseNumber), [2, 3]);
  assert.ok(value.mutationOptions.some(mutation => mutation.name === "Scourroot" && mutation.adjacent.some(crop => crop.crop === "Potato")));
  assert.equal(value.mutationOptions.some(mutation => mutation.name === "Ashwreath"), false);
  assert.equal(value.nextOffersMilestone?.remaining, 2);
  assert.equal(value.nextUniqueVisitorsMilestone?.remaining, 4);
  assert.deepEqual(value.activeOffers[0].requirements, [{ itemId: "ENCHANTED_CACTUS", amount: 2 }]);
  assert.deepEqual(value.nextCropMilestones.find(crop => crop.crop === "WHEAT"),
    { crop: "WHEAT", resourceId: "WHEAT", collected: 123, tier: 3, threshold: 160, remaining: 37 });
  advisorDomainContextSchema.parse(value);
});

test("crop milestones use crop-specific Garden counters and leave absent crops unreported", () => {
  const next = nextCropMilestones({ POTATO_ITEM: 469373, MELON: 2885695, UNKNOWN: 100 });
  assert.deepEqual(next, [
    { crop: "POTATO", resourceId: "POTATO_ITEM", collected: 469373, tier: 16, threshold: 494500, remaining: 25127 },
    { crop: "MELON_SLICE", resourceId: "MELON", collected: 2885695, tier: 20, threshold: 3667100, remaining: 781405 },
  ]);
  assert.deepEqual(nextCropMilestones({}), []);
});

test("missing Garden response leaves counts unreported", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const value = buildFarmingAdvisorContext(profile, null);
  assert.equal(value.domain, "FARMING");
  if (value.domain !== "FARMING") return;
  assert.equal(value.gardenAvailable, false);
  assert.equal(value.totalOffersAccepted, null);
  assert.equal(value.nextGardenLevel, null);
  assert.deepEqual(value.nextCropMilestones, []);
  assert.deepEqual(value.mutationOptions, []);
  assert.deepEqual(value.nextPestUnlocks, []);
  assert.deepEqual(value.plotExpansionOptions, []);
  assert.deepEqual(value.greenhouseExpansionOptions, []);
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
  assert.deepEqual(value.nextPestUnlocks.map(pest => pest.name), ["Dragonfly", "Firefly"]);
  assert.ok(value.mutationOptions.some(mutation => mutation.name === "Ashwreath"));
});
