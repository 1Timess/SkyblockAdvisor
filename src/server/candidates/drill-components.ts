import type { CandidateItem } from "../../schemas/catalog";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { ProfileItem } from "../../schemas/items";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { prepareCandidate } from "./common";

const slotCategory = {
  ENGINE: "drill_engine",
  FUEL_TANK: "drill_fuel_tank",
  UPGRADE_MODULE: "drill_upgrade_module",
} as const;
const slotPriority = { ENGINE: 0, UPGRADE_MODULE: 1, FUEL_TANK: 2 } as const;
const miningStats = ["miningSpeed", "miningFortune", "gemstoneFortune", "pristine", "coldResistance"] as const;

export function buildMiningDrillComponentUpgradeLanes(input: {
  profile: NormalizedSkyBlockProfile; catalog: readonly CandidateItem[]; quotes: ReadonlyMap<string, MarketQuote>; budgetCoins?: number;
}): Record<string, AdvisorCandidate[]> {
  const lanes: Record<string, AdvisorCandidate[]> = {};
  const owned = new Set(input.profile.inventoryItems.flatMap(item => item.id ? [item.id] : []));
  const relevantParents = miningRelevantDrillParents(input.profile.inventoryItems, input.catalog);
  for (const drill of input.profile.inventoryItems) {
    if (!drill.drillComponents || !relevantParents.has(itemKey(drill))) continue;
    for (const slot of Object.keys(slotCategory) as Array<keyof typeof slotCategory>) {
      const currentId = installedId(drill, slot);
      const current = currentId ? input.catalog.find(item => item.id === currentId) : undefined;
      const choices = input.catalog.filter(item => item.categories.includes(slotCategory[slot]) && item.id !== currentId);
      for (const part of choices) {
        const candidate = prepareCandidate("tool", part, input.profile, input.quotes,
          { budgetCoins: input.budgetCoins, ownedItemIds: owned, eligibilityMode: "ADVISOR_DISCOVERY" });
        if (!candidate) continue;
        if (!isDrillComponentProgressionCandidate(slot, current, part)) continue;
        const changes = componentChanges(current, part);
        const relevantStats = Object.keys(changes).filter(stat => (changes[stat].candidate ?? 0) > (changes[stat].current ?? 0));
        const id = `DRILL_COMPONENT:${drill.uuid ?? drill.id ?? drill.name}:${slot}:${part.id}`;
        const mutation: AdvisorCandidate = {
          ...candidate, id, item: { ...candidate.item, id, name: `${currentId ? "Replace" : "Install"} ${part.name} on ${drill.name}`,
            categories: [...new Set([...candidate.item.categories, "item_upgrade", "drill_component_upgrade"])] },
          knownChanges: changes,
          mutation: { kind: "DRILL_COMPONENT", parentItemKey: drill.uuid ?? `${drill.id ?? drill.name}:${drill.source}`,
            parentItemId: drill.id, parentItemName: drill.name, slotId: slot, operation: currentId ? "REPLACE" : "INSTALL",
            currentPartId: currentId, targetPartId: part.id, impactPriority: slotPriority[slot] },
          warnings: [...candidate.warnings,
            `This is a ${currentId ? "replacement" : "new installation"} for the ${slot.toLowerCase().replaceAll("_", " ")} slot on an owned drill, not a drill replacement.`,
            "Known stat deltas describe the component contribution only; passive or conditional effects remain in the component lore."],
        };
        const laneStats = relevantStats.length ? relevantStats : ["miningUtility"];
        for (const stat of laneStats) (lanes[stat] ??= []).push(mutation);
      }
    }
  }
  return lanes;
}

function installedId(item: ProfileItem, slot: keyof typeof slotCategory) {
  if (slot === "ENGINE") return item.drillComponents?.engine ?? null;
  if (slot === "FUEL_TANK") return item.drillComponents?.fuelTank ?? null;
  return item.drillComponents?.upgradeModule ?? null;
}
function componentChanges(current: CandidateItem | undefined, target: CandidateItem) {
  const changes: NonNullable<AdvisorCandidate["knownChanges"]> = {};
  for (const stat of miningStats) {
    const before = current?.stats[stat] ?? 0, after = target.stats[stat] ?? 0;
    if (before !== 0 || after !== 0) changes[stat] = { current: before, candidate: after };
  }
  const before = current?.drillComponentMechanics, after = target.drillComponentMechanics;
  if (after?.miningSpeed !== null && after?.miningSpeed !== undefined) changes.miningSpeed = { current: before?.miningSpeed ?? 0, candidate: after.miningSpeed };
  if (after?.miningFortune !== null && after?.miningFortune !== undefined) changes.miningFortune = { current: before?.miningFortune ?? 0, candidate: after.miningFortune };
  return changes;
}

export function isDrillComponentProgressionCandidate(slot: keyof typeof slotCategory, current: CandidateItem | undefined, target: CandidateItem) {
  const after = target.drillComponentMechanics;
  if (!after) return false;
  if (!current) return true;
  const before = current.drillComponentMechanics;
  if (!before) return false;
  if (slot === "UPGRADE_MODULE") return false; // Modules are goal-dependent tradeoffs until activity intent can rank their mechanics.
  if (slot === "ENGINE") return dominates([before.miningSpeed, before.miningFortune], [after.miningSpeed, after.miningFortune]);
  return dominates([before.fuelCapacity, before.pickaxeCooldownReductionPct], [after.fuelCapacity, after.pickaxeCooldownReductionPct]);
}

function dominates(before: Array<number | null>, after: Array<number | null>) {
  let better = false;
  for (let i = 0; i < before.length; i++) {
    const a = after[i], b = before[i];
    if (a === null || b === null || a < b) return false;
    if (a > b) better = true;
  }
  return better;
}


export function miningRelevantDrillParents(items: readonly ProfileItem[], catalog: readonly CandidateItem[]) {
  const drills = items.filter(item => item.drillComponents);
  const vectors = new Map(drills.map(drill => [itemKey(drill), drillPotentialVector(drill, catalog)]));
  return new Set(drills.filter(drill => {
    const vector = vectors.get(itemKey(drill))!;
    return !drills.some(other => other !== drill && dominatesVector(vectors.get(itemKey(other))!, vector));
  }).map(itemKey));
}

function drillPotentialVector(drill: ProfileItem, catalog: readonly CandidateItem[]) {
  const bestEngine = catalog.filter(item => item.categories.includes("drill_engine"))
    .map(item => item.drillComponentMechanics).filter(Boolean)
    .reduce((best, mechanics) => ({
      miningSpeed: Math.max(best.miningSpeed, mechanics?.miningSpeed ?? 0),
      miningFortune: Math.max(best.miningFortune, mechanics?.miningFortune ?? 0),
    }), { miningSpeed: 0, miningFortune: 0 });
  const currentEngine = drill.drillComponents?.engine ? catalog.find(item => item.id === drill.drillComponents?.engine)?.drillComponentMechanics : undefined;
  return {
    miningSpeed: (drill.stats.miningSpeed ?? 0) - (currentEngine?.miningSpeed ?? 0) + bestEngine.miningSpeed,
    miningFortune: (drill.stats.miningFortune ?? 0) - (currentEngine?.miningFortune ?? 0) + bestEngine.miningFortune,
    gemstoneFortune: drill.stats.gemstoneFortune ?? 0,
    pristine: drill.stats.pristine ?? 0,
  };
}

function dominatesVector(left: Readonly<Record<string, number>>, right: Readonly<Record<string, number>>) {
  const stats = ["miningSpeed", "miningFortune", "gemstoneFortune", "pristine"] as const;
  return stats.every(stat => (left[stat] ?? 0) >= (right[stat] ?? 0))
    && stats.some(stat => (left[stat] ?? 0) > (right[stat] ?? 0));
}

function itemKey(item: ProfileItem) {
  return item.uuid ?? `${item.id ?? item.name}:${item.source}`;
}
