import assert from "node:assert/strict";
import test from "node:test";
import { experimentationFactSchema } from "../src/schemas/enchanting-mechanics";
import { enchantingLevelFromXp, enchantingMilestones, experimentationMechanics, upcomingEnchantingMilestones } from "../src/server/reference/enchanting-mechanics";

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
  assert.equal(experimentationMechanics.tiers.value, null);
  assert.equal(experimentationFactSchema.safeParse({ status: "KNOWN", value: null, source: null }).success, false);
  assert.equal(experimentationFactSchema.safeParse({ status: "UNKNOWN", value: "three", source: null }).success, false);
});
