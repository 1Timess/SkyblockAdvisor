import catalog from "../reference/greenhouse-mutations.json";
import layouts from "../reference/greenhouse-mutation-layouts.json";

export type MutationDefinition = (typeof catalog.mutations)[number];
const byName = new Map(catalog.mutations.map(mutation => [mutation.name, mutation]));
const layoutsByName: Record<string, { width: number; cells: string[] }> = layouts.layouts;

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
    verifiedLayoutCount: Object.keys(layoutsByName).length,
    countOnlyOrSpecial: catalog.mutations.filter(mutation => !layoutsByName[mutation.name]).map(mutation => mutation.name),
    analysisMilestones: [1, 10, 15, 20, 30, 40],
    profileAnalysisStatus: "UNREPORTED" as const };
}
