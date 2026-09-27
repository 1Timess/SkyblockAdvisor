import assert from "node:assert/strict";
import test from "node:test";
import { possibleExperimentRewards } from "../src/server/reference/enchanting-rewards";

test("post-overhaul possible rewards retain distinct rare and ultra-rare pools", () => {
  assert.equal(possibleExperimentRewards.filter(reward => reward.pool === "RARE").length, 16);
  assert.equal(possibleExperimentRewards.filter(reward => reward.pool === "ULTRA_RARE").length, 30);
  assert.equal(new Set(possibleExperimentRewards.map(reward => reward.name)).size, possibleExperimentRewards.length);
  assert.ok(!possibleExperimentRewards.some(reward => /Basic|Advanced/.test(reward.name)));
});

test("physical rewards have researched tier floors without player meter assumptions", () => {
  const byName = new Map(possibleExperimentRewards.map(reward => [reward.name, reward]));
  assert.equal(byName.get("Guardian Pet")?.minimumStake, "BEGINNER");
  assert.equal(byName.get("Metaphysical Serum")?.minimumStake, "GRAND");
  assert.equal(byName.get("Nadeshiko Dye")?.minimumStake, "SUPREME");
  assert.equal(byName.get("Experiment the Fish")?.minimumStake, "METAPHYSICAL");
  assert.equal(byName.get("Growth VI")?.minimumStake, null);
  assert.ok(possibleExperimentRewards.every(reward => reward.source.startsWith("https://")));
});
