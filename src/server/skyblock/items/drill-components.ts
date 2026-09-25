import type { DrillComponentState } from "../../../schemas/items";

function text(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
function canonical(value: string | null) { return value ? value.toUpperCase() : null; }
function nestedId(value: unknown) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? text((value as Record<string, unknown>).id) : null;
}

export function extractDrillComponentState(categories: readonly string[], extra: Record<string, unknown>): DrillComponentState | undefined {
  if (!categories.includes("drill")) return undefined;
  const engine = canonical(text(extra.drill_part_engine) ?? nestedId(extra.engine));
  const fuelTank = canonical(text(extra.drill_part_fuel_tank) ?? nestedId(extra.fuel_tank));
  const upgradeModule = canonical(text(extra.drill_part_upgrade_module) ?? nestedId(extra.upgrade_module));
  const fuel = typeof extra.drill_fuel === "number" && Number.isFinite(extra.drill_fuel) ? Math.max(0, Math.floor(extra.drill_fuel)) : null;
  return { engine, fuelTank, upgradeModule, fuel, source: "NBT" };
}
