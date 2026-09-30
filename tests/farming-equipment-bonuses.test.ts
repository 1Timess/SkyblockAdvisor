import assert from "node:assert/strict";
import test from "node:test";
import { farmingBonusMechanics } from "../src/server/farming/equipment-bonuses";

test("visitor tooltip progress remains distinct from template defaults", () => {
  const value = farmingBonusMechanics(["§6Piece Bonus: Florist", "Piece Bonus: +6", "Next Upgrade: +7 (98/100)"], "OBSERVED_TOOLTIP");
  assert.deepEqual(value.visitorBonus, { name: "Florist", displayedFortune: 6, nextDisplayedFortune: 7, nextFortuneDelta: 1,
    displayedOffersProgress: 98, displayedOffersRequired: 100, remainingOffers: 2 });
  const template = farmingBonusMechanics(["Piece Bonus: Salesperson", "Piece Bonus: +0", "Next Upgrade: +1 (0/1)"], "CATALOG_TEMPLATE");
  assert.equal(template.evidence, "CATALOG_TEMPLATE");
  assert.equal(template.visitorBonus?.displayedFortune, 0);
  assert.equal(template.visitorBonus?.nextDisplayedFortune, 1);
  assert.equal(template.visitorBonus?.nextFortuneDelta, 1);
  assert.match(template.note, /not player state/);
  assert.equal(farmingBonusMechanics(["Piece Bonus: Salesperson"], "OBSERVED_TOOLTIP").visitorBonus?.remainingOffers, null);
});

test("tiered tooltip numbers retain conditional text and do not invent piece-count scaling", () => {
  const value = farmingBonusMechanics(["Bonus Pest Chance: +10%", "Tiered Bonus: Cropier Crops (3/4)",
    "Farming Wheat, Carrots, and Potatoes has a 0.04% chance of dropping a Cropie.",
    "Inside the Greenhouse gives a 16.0% chance to drop one. Grants 20 Farming Fortune."], "OBSERVED_TOOLTIP");
  assert.equal(value.tieredBonus?.displayedPieceCount, 3);
  assert.equal(value.tieredBonus?.displayedFortune, 20);
  assert.deepEqual(value.tieredBonus?.displayedDropChancePercent, [0.04, 16]);
  assert.equal(value.displayedPestChancePercent, 10);
  assert.match(value.tieredBonus!.effectText, /Wheat, Carrots, and Potatoes/);
  assert.equal(farmingBonusMechanics([], "OBSERVED_TOOLTIP").tieredBonus, null);
});
