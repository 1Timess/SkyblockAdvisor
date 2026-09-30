import assert from "node:assert/strict";
import test from "node:test";
import { inspectFarmingResearch } from "../src/server/farming/research-inspection";

test("Farming research keeps source presence distinct and excludes arbitrary payloads", () => {
  const result = inspectFarmingResearch({ garden_player_data: { invented: { secret: "private" } },
    jacobs_contest: { perks: { farming_level_cap: 3 }, contests: { opaque: "sensitive" } } }, {
    garden_experience: 120, resources_collected: { WHEAT: 250, BAD: "oops" }, crop_upgrade_levels: { WHEAT: 2 },
    active_commissions: { jerry: { status: "NOT_STARTED", requirement: [{ item: "WHEAT", amount: 99, secret: "private" }] } },
    commission_data: { visits: { jerry: 2 }, completed: { jerry: 1 }, total_completed: 1 },
    composter_data: { upgrades: { speed: 2 }, fuel_units: 123, secret: "private" },
    secret: "private",
  });
  assert.equal(result.garden.experience, 120);
  assert.deepEqual(result.garden.resourcesCollected, { WHEAT: 250 });
  assert.deepEqual(result.garden.activeCommissions.jerry.requirementItemIds, ["WHEAT"]);
  assert.equal(result.jacobsContest.farmingLevelCapBonus, 3);
  assert.ok(!JSON.stringify(result).includes("private"));
  assert.deepEqual(inspectFarmingResearch({}, null).garden, { present: false, keys: [], experience: null,
    resourcesCollected: {}, cropUpgradeLevels: {}, unlockedPlotIds: [],
    commissions: { keys: [], visits: {}, completed: {}, totalCompleted: null, uniqueNpcsServed: null },
    activeCommissions: {}, composter: { keys: [], upgrades: {} } });
});
