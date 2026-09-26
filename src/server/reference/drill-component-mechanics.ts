import type { DrillComponentMechanics } from "../../schemas/catalog";

function number(pattern: RegExp, text: string) {
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(value) ? value : null;
}

export function parseDrillComponentMechanics(lore: readonly string[]): DrillComponentMechanics | undefined {
  if (!lore.some(line => line.trim().toLowerCase() === "drill part")) return undefined;
  const text = lore.join(" ").replace(/\s+/g, " ");
  const slot = /Drill Engine\s+slot/i.test(text) ? "ENGINE"
    : /Fuel Tank\s+slot/i.test(text) ? "FUEL_TANK"
    : /Upgrade Module\s+slot/i.test(text) ? "UPGRADE_MODULE" : null;
  if (!slot) return undefined;

  const miningSpeed = number(/\+(\d[\d,]*(?:\.\d+)?)\D*Mining Speed/i, text);
  const miningFortune = number(/\+(\d[\d,]*(?:\.\d+)?)\D*Mining Fortune/i, text);
  const fuelCapacity = number(/([\d,]+) Max Fuel Capacity/i, text);
  const pickaxeCooldownReductionPct = number(/-(\d+(?:\.\d+)?)% Pickaxe Ability Cooldown/i, text);
  const powderMultiplierPct = number(/\+(\d+(?:\.\d+)?)% Powder/i, text);
  const hotmPerkLevelBonus = number(/Adds \+(\d+) Level to all of your unlocked Heart of the Mountain perks/i, text);
  const fuelPreservationPct = number(/(\d+(?:\.\d+)?)% chance to not consume Fuel/i, text);
  const fuelConsumptionMultiplier = number(/consumes (?:x|×)?(\d+(?:\.\d+)?)\s*(?:times?)? the Fuel/i, text)
    ?? (/consumes quadruple the Fuel/i.test(text) ? 4 : null);
  const conditional = /Doubled when|when within|for every/i.test(text);

  return { slot, miningSpeed, miningFortune, fuelCapacity, pickaxeCooldownReductionPct, powderMultiplierPct,
    hotmPerkLevelBonus, fuelPreservationPct, fuelConsumptionMultiplier, conditional };
}
