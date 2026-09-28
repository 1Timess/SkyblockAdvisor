import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { buildFarmingAdvisorContext } from "../src/server/farming/advisor-context";
import { advisorDomainContextSchema } from "../src/schemas/advisor";
import { fixtureSources } from "./fixtures/profile";

test("Farming context keeps distinct Garden thresholds and observed offers", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const value = buildFarmingAdvisorContext(profile, {
    garden_experience: 9330, resources_collected: { WHEAT: 123 },
    commission_data: { total_completed: 98, unique_npcs_served: 46 },
    active_commissions: { tia: { status: "NOT_STARTED", requirement: [{ item: "ENCHANTED_CACTUS", amount: 2 }] } },
  });
  assert.equal(value.domain, "FARMING");
  if (value.domain !== "FARMING") return;
  assert.deepEqual(value.nextGardenLevel, { level: 10, xpRequired: 10120, xpRemaining: 790 });
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
});
