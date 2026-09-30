import assert from "node:assert/strict";
import test from "node:test";
import { extractStats } from "../src/server/skyblock/items/parse-stats";

test("parses live Foraging and Hunting stat labels from item lore", () => {
  const result = extractStats([
    "Sweep: +100",
    "Foraging Fortune: +50",
    "Foraging Wisdom: +5",
    "Hunting Fortune: +20",
    "Hunting Wisdom: +3",
  ]);
  assert.deepEqual(result.stats, {
    sweep: 100,
    foragingFortune: 50,
    foragingWisdom: 5,
    huntingFortune: 20,
    huntingWisdom: 3,
  });
  assert.deepEqual(result.unknown, []);
});
