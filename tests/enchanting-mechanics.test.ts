import assert from "node:assert/strict";
import test from "node:test";
import { experimentationFactSchema, experimentTierSchema } from "../src/schemas/enchanting-mechanics";
import { enchantingLevelFromXp, enchantingMilestones, experimentationMechanics, researchedExperimentTiers, upcomingEnchantingMilestones } from "../src/server/reference/enchanting-mechanics";

test("Enchanting uses the shared skill XP curve and cap", () => {
  assert.equal(enchantingLevelFromXp(9_925).level, 10);
  assert.equal(enchantingLevelFromXp(111_672_425).level, 60);
  assert.equal(enchantingLevelFromXp(111_672_425).maxed, true);
});

test("confirmed unlocks are ordered and routine reward levels are omitted", () => {
  assert.ok(enchantingMilestones.every((entry, index) => index === 0 || entry.level >= enchantingMilestones[index - 1].level));
  assert.ok(enchantingMilestones.some(entry => entry.level === 10 && entry.name === "Experimentation Table"));
  assert.ok(enchantingMilestones.some(entry => entry.level === 38 && entry.name === "One For All"));
  assert.ok(!enchantingMilestones.some(entry => entry.level === 39 || entry.level === 60));
  assert.ok(upcomingEnchantingMilestones(37).every(entry => entry.level > 37));
  assert.deepEqual(upcomingEnchantingMilestones(60), []);
});

test("unverified experimentation details remain unknown rather than asserted", () => {
  assert.equal(experimentationMechanics.accessLevel, 10);
  assert.equal(experimentationMechanics.dailyCharges.status, "UNKNOWN");
  assert.equal(experimentationMechanics.tiers.length, 14);
  assert.equal(experimentationFactSchema.safeParse({ status: "KNOWN", value: null, source: null }).success, false);
  assert.equal(experimentationFactSchema.safeParse({ status: "UNKNOWN", value: "three", source: null }).success, false);
});

test("researched experiment thresholds preserve the three separate progressions", () => {
  const levels = (experiment: string) => researchedExperimentTiers.filter(tier => tier.experiment === experiment).map(tier => tier.requiredEnchantingLevel);
  assert.deepEqual(levels("CHRONOMATRON"), [20, 25, 30, 35, 40]);
  assert.deepEqual(levels("ULTRASEQUENCER"), [25, 30, 40]);
  assert.deepEqual(levels("SUPERPAIRS"), [10, 20, null, 30, 40, 50]);
  assert.ok(researchedExperimentTiers.every(tier => tier.source.endsWith("/Experiments")));
  assert.ok(!enchantingMilestones.some(milestone => milestone.name.includes("Superpairs")));
});

test("the conflicting Grand Superpairs row cannot assert level 2 or enter milestones", () => {
  const grand = researchedExperimentTiers.find(tier => tier.experiment === "SUPERPAIRS" && tier.stake === "GRAND")!;
  assert.equal(grand.evidence, "CONFLICTING_SOURCE");
  assert.equal(grand.requiredEnchantingLevel, null);
  assert.equal(experimentTierSchema.safeParse({ ...grand, evidence: "COMMUNITY_WIKI_RESEARCH" }).success, false);
  assert.equal(experimentTierSchema.safeParse({ ...grand, requiredEnchantingLevel: 2 }).success, false);
});
