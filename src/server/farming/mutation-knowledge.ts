import catalog from "../reference/greenhouse-mutations.json";
import layouts from "../reference/greenhouse-mutation-layouts.json";
import spawn from "../reference/greenhouse-spawn-weights.json";
import behaviors from "../reference/greenhouse-special-behaviors.json";

export type MutationDefinition = (typeof catalog.mutations)[number];
const byName = new Map(catalog.mutations.map(mutation => [mutation.name, mutation]));
const layoutsByName: Record<string, { width: number; cells: string[] }> = layouts.layouts;
const weights: Record<string, number> = spawn.weights;

export function mutationSpawnWeight(name: string) {
  return Object.hasOwn(weights, name) ? { weight: weights[name], actualChance: null,
    interpretation: "WEIGHT_NOT_PROBABILITY" as const } : null;
}

export function mutationSpecialBehaviors() {
  return behaviors.behaviors.map(({ name, rule }) => ({ name, rule }));
}
const baseCropLevels: Record<string, number> = {
  Wheat: 1, Carrot: 2, Potato: 3, Pumpkin: 4, "Sugar Cane": 5, "Melon": 6,
  Cactus: 7, "Cocoa Beans": 8, "Red Mushroom": 9, "Brown Mushroom": 9,
  "Nether Wart": 10, Sunflower: 11, Moonflower: 11, "Wild Rose": 12,
};

export function mutationLayout(name: string) {
  return layoutsByName[name] ?? null;
}

/** Reference-only dependency closure. It does not model physical placement or a player's discoveries. */
export function mutationPrerequisites(name: string) {
  const target = byName.get(name);
  if (!target) return null;
  const visiting = new Set<string>(), visited = new Set<string>(), order: string[] = [];
  const visit = (current: string) => {
    if (visited.has(current)) return;
    if (visiting.has(current)) throw new Error(`Cycle in greenhouse mutation catalog at ${current}`);
    const entry = byName.get(current);
    if (!entry) throw new Error(`Unknown greenhouse mutation prerequisite: ${current}`);
    visiting.add(current);
    for (const dependency of entry.dependencies) visit(dependency);
    visiting.delete(current);
    visited.add(current);
    order.push(current);
  };
  visit(name);
  return { target: name, path: order, specialSteps: order.filter(step => byName.get(step)?.condition === "SPECIAL"),
    source: catalog.source };
}

export function mutationCatalogSummary() {
  return { total: catalog.mutations.length,
    byRarity: Object.fromEntries(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]
      .map(rarity => [rarity, catalog.mutations.filter(mutation => mutation.rarity === rarity).length])),
    specialCount: catalog.mutations.filter(mutation => mutation.condition === "SPECIAL").length,
    spawnWeightCoverage: Object.keys(weights).length,
    actualSpawnChanceStatus: "UNREPORTED" as const,
    verifiedLayoutCount: Object.keys(layoutsByName).length,
    countOnlyOrSpecial: catalog.mutations.filter(mutation => !layoutsByName[mutation.name]).map(mutation => mutation.name),
    analysisMilestones: [1, 10, 15, 20, 30, 40],
    profileAnalysisStatus: "UNREPORTED" as const };
}

/** Reference paths only: crop access is a level gate, not evidence of planted crops or mutation discovery. */
export function mutationProgressionPaths(gardenLevel: number | null) {
  if (gardenLevel === null || gardenLevel < 7) return [];
  return ["Chocoberry", "Soggybud", "Duskbloom", "Snoozling", "Timestalk"].map(name => {
    const closure = mutationPrerequisites(name)!;
    const baseCrops = [...new Set(closure.path.flatMap(step => byName.get(step)!.requirements
      .filter(requirement => !byName.has(requirement.name)).map(requirement => requirement.name)))].sort();
    const unknownInputs = baseCrops.filter(crop => baseCropLevels[crop] === undefined);
    const requiredGardenLevel = Math.max(7, ...baseCrops.map(crop => baseCropLevels[crop] ?? 0));
    return { name, prerequisiteMutations: closure.path.slice(0, -1), baseCrops,
      spawnWeight: mutationSpawnWeight(name)!.weight,
      requiredGardenLevel, cropAccess: unknownInputs.length ? "UNDETERMINED" as const
        : gardenLevel >= requiredGardenLevel ? "LEVEL_ELIGIBLE" as const : "FUTURE_LEVEL" as const,
      unknownInputs, specialSteps: closure.specialSteps,
      layoutStatus: mutationLayout(name) ? "REFERENCE_GRID" as const : "SPECIAL_OR_COUNT_ONLY" as const,
      profileDiscoveryStatus: "UNREPORTED" as const };
  });
}
