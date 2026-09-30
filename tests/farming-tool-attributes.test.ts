import assert from "node:assert/strict";
import test from "node:test";
import { processItem } from "../src/server/skyblock/items/process-item";
import { inspectFarmingToolAttributes } from "../src/server/farming/tool-attribute-inspection";

test("Farming tool audit exposes bounded progression keys without raw NBT", () => {
  const item = processItem({ tag: { display: { Name: "Melon Dicer" }, ExtraAttributes: { id: "MELON_DICER_3",
    farming_tool_experience: 123, gemstone_slots: { topaz: "private" }, owner_uuid: "sensitive" } } }, "enderchest", 0, []);
  assert.ok(item);
  const result = inspectFarmingToolAttributes([item]);
  assert.equal(result.totalMatches, 1);
  assert.equal(result.tools[0].numericFields.farming_tool_experience, 123);
  assert.deepEqual(result.tools[0].nestedKeys.gemstone_slots, ["topaz"]);
  assert.ok(!JSON.stringify(result).includes("private"));
  assert.ok(!JSON.stringify(result).includes("sensitive"));
});
