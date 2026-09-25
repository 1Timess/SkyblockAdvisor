import assert from "node:assert/strict";
import test from "node:test";
import { categoriesForReferenceLore } from "../src/server/reference/item-catalog";

test("classifies drill engine reference lore", () => {
  assert.deepEqual(categoriesForReferenceLore([
    "Drill Part", "", "+250 Mining Speed", "+30 Mining Fortune", "",
    "Put this item in the Drill Engine slot", "of a Drill at a Drill Mechanic!",
  ]), ["tool", "drill_component", "drill_engine"]);
});

test("classifies drill fuel tank reference lore across wrapped lines", () => {
  assert.deepEqual(categoriesForReferenceLore([
    "Drill Part", "", "50,000 Max Fuel Capacity", "-6% Pickaxe Ability Cooldown", "",
    "Put this item in the Fuel Tank slot of", "a Drill at a Drill Mechanic!",
  ]), ["tool", "drill_component", "drill_fuel_tank"]);
});

test("classifies drill upgrade module reference lore across wrapped lines", () => {
  assert.deepEqual(categoriesForReferenceLore([
    "Drill Part", "", "Earn +20% Powder from all sources.", "",
    "Put this item in the Upgrade Module", "slot of a Drill at a Drill Mechanic!",
  ]), ["tool", "drill_component", "drill_upgrade_module"]);
});

test("does not classify unrelated lore from slot wording alone", () => {
  assert.deepEqual(categoriesForReferenceLore(["Put this item in the Drill Engine slot"]), []);
});

test("retains generic drill component classification when slot is unknown", () => {
  assert.deepEqual(categoriesForReferenceLore(["Drill Part", "A future component shape."]), ["tool", "drill_component"]);
});
