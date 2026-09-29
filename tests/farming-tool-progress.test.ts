import assert from "node:assert/strict";
import test from "node:test";
import { processItem, toProfileItem } from "../src/server/skyblock/items/process-item";
import { extractFarmingToolProgress, farmingToolCrop, nextFarmingToolLevel } from "../src/server/farming/tool-progress";

test("Farming tool levelable fields survive item normalization without invented thresholds", () => {
  const raw = { tag: { display: { Name: "Melon Dicer" }, ExtraAttributes: { id: "MELON_DICER_3", levelable_lvl: 39,
    levelable_exp: 424057.75, farming_for_dummies_count: 5, farmed_cultivating: "unparsed" } } };
  const item = processItem(raw, "enderchest", 0, []);
  assert.ok(item);
  assert.deepEqual(toProfileItem(item).farmingToolProgress, { rawLevel: 39, rawExperience: 424057.75, farmingForDummiesCount: 5 });
  assert.equal(extractFarmingToolProgress("MELON_DICER_3", { levelable_exp: "unreported" }), null);
  assert.equal(extractFarmingToolProgress("SWORD", raw.tag.ExtraAttributes), null);
});

test("specialized tool crop identity is bounded and does not guess generic tool crops", () => {
  assert.equal(farmingToolCrop("THEORETICAL_HOE_POTATO_1"), "potato");
  assert.equal(farmingToolCrop("MELON_DICER_3"), "melon");
  assert.equal(farmingToolCrop("ADVANCED_GARDENING_HOE"), null);
  assert.equal(farmingToolCrop("THEORETICAL_HOE_UNKNOWN_1"), null);
});

test("live tool counters yield guarded next-level XP estimates", () => {
  const early = nextFarmingToolLevel({ rawLevel: 2, rawExperience: 268.66666666666623 });
  assert.equal(early?.level, 3);
  assert.equal(early?.experienceRequired, 2000);
  assert.ok(early && Math.abs(early.experienceRemaining - 1731.333333333334) < 0.001);
  assert.equal(early.interpretation, "INFERRED_WITHIN_LEVEL");
  assert.deepEqual(nextFarmingToolLevel({ rawLevel: 39, rawExperience: 424057.75 }),
    { level: 40, experienceRequired: 1250000, experienceRemaining: 825942.25,
      interpretation: "INFERRED_WITHIN_LEVEL" });
  assert.equal(nextFarmingToolLevel({ rawLevel: 39, rawExperience: 1500000 }), null);
  assert.equal(nextFarmingToolLevel({ rawLevel: 50, rawExperience: 100 }), null);
});
