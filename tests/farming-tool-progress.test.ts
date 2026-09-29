import assert from "node:assert/strict";
import test from "node:test";
import { processItem, toProfileItem } from "../src/server/skyblock/items/process-item";
import { extractFarmingToolProgress, farmingToolCrop } from "../src/server/farming/tool-progress";

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
