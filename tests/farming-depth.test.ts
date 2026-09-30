import assert from "node:assert/strict";
import test from "node:test";
import { inspectFarmingDepth } from "../src/server/farming/depth-inspection";

test("Farming depth inspection reports bounded shapes without raw layouts", () => {
  const value = inspectFarmingDepth({ garden_player_data: { copper: 5 }, farming_pests: { kills: { fly: 7 } } }, {
    unlocked_plots_ids: ["beginner_2", "beginner_1"], garden_upgrades: { plot_limit: 1 },
    greenhouse_slots: [{ secretLayout: "private", mutations: { one: true } }], pests: { active: 3 },
  });
  assert.deepEqual(value.gardenFields.unlockedPlotIds, ["beginner_1", "beginner_2"]);
  assert.equal(value.gardenFields.greenhouseSlots.kind, "ARRAY");
  assert.deepEqual(value.gardenFields.greenhouseSlots.sampleEntryKeys, ["mutations", "secretLayout"]);
  assert.ok(!JSON.stringify(value).includes("private"));
});
