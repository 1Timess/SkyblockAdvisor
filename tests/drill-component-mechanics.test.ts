import assert from "node:assert/strict";
import test from "node:test";
import { parseDrillComponentMechanics } from "../src/server/reference/drill-component-mechanics";

test("parses engine stats with SkyBlock icons between values and labels", () => {
  const value = parseDrillComponentMechanics(["Drill Part", "+250 Mining Speed", "+30 Mining Fortune", "Put this item in the Drill Engine slot"]);
  assert.deepEqual(value, { slot: "ENGINE", miningSpeed: 250, miningFortune: 30, fuelCapacity: null, pickaxeCooldownReductionPct: null,
    powderMultiplierPct: null, hotmPerkLevelBonus: null, fuelPreservationPct: null, fuelConsumptionMultiplier: null, conditional: false });
});

test("parses fuel tank progression mechanics", () => {
  const value = parseDrillComponentMechanics(["Drill Part", "50,000 Max Fuel Capacity", "-6% Pickaxe Ability Cooldown", "Put this item in the Fuel Tank slot of a Drill"]);
  assert.equal(value?.fuelCapacity, 50000); assert.equal(value?.pickaxeCooldownReductionPct, 6);
});

test("parses representative module mechanics without treating them as a linear chain", () => {
  assert.equal(parseDrillComponentMechanics(["Drill Part", "Earn +20% Powder from all sources.", "Put this item in the Upgrade Module slot of a Drill"])?.powderMultiplierPct, 20);
  assert.equal(parseDrillComponentMechanics(["Drill Part", "Adds +1 Level to all of your unlocked Heart of the Mountain perks.", "Put this item in the Upgrade Module slot"])?.hotmPerkLevelBonus, 1);
  assert.equal(parseDrillComponentMechanics(["Drill Part", "Grants a 75% chance to not consume Fuel when mining.", "Put this item in the Upgrade Module slot"])?.fuelPreservationPct, 75);
  assert.equal(parseDrillComponentMechanics(["Drill Part", "Grants +50 Mining Fortune, but this Drill consumes quadruple the Fuel.", "Put this item in the Upgrade Module slot"])?.fuelConsumptionMultiplier, 4);
});
