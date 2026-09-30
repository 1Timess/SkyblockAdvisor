import assert from "node:assert/strict";
import test from "node:test";
import { greenhouseExpansionOptions, plotExpansionOptions } from "../src/server/farming/plot-progress";

test("plot cost follows unlocked tier count rather than numeric plot ID", () => {
  const lemon = plotExpansionOptions(["beginner_1", "beginner_2", "beginner_4", "beginner_3", "intermediate_2", "intermediate_3"], 10);
  assert.deepEqual(lemon.map(option => [option.group, option.cost]), [
    ["intermediate", { item: "COMPOST", amount: 32 }],
    ["advanced", { item: "COMPOST", amount: 64 }],
    ["expert", { item: "COMPOST_BUNDLE", amount: 8 }],
  ]);
  const blueberry = plotExpansionOptions(["beginner_2", "beginner_1", "beginner_4", "beginner_3",
    "intermediate_2", "intermediate_1", "intermediate_4", "advanced_5"], 9);
  assert.deepEqual(blueberry.map(option => [option.group, option.cost]), [
    ["intermediate", { item: "COMPOST", amount: 48 }],
    ["advanced", { item: "COMPOST", amount: 96 }],
    ["expert", { item: "COMPOST_BUNDLE", amount: 8 }],
  ]);
  assert.equal(greenhouseExpansionOptions.length, 2);
  assert.deepEqual(plotExpansionOptions(["beginner_4", "beginner_4"], 1).map(option => option.group), ["beginner"]);
  assert.deepEqual(plotExpansionOptions([], null), []);
});
