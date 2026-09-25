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
  for (const drill of input.profile.inventoryItems) {
    if (!drill.drillComponents) continue;
    for (const slot of Object.keys(slotCategory) as Array<keyof typeof slotCategory>) {
      const currentId = installedId(drill, slot);
      const current = currentId ? input.catalog.find(item => item.id === currentId) : undefined;
      const choices = input.catalog.filter(item => item.categories.includes(slotCategory[slot]) && item.id !== currentId);
      for (const part of choices) {
        const candidate = prepareCandidate("tool", part, input.profile, input.quotes,
          { budgetCoins: input.budgetCoins, ownedItemIds: owned, eligibilityMode: "ADVISOR_DISCOVERY" });
        if (!candidate) continue;
        const changes = componentChanges(current, part);
        const relevantStats = Object.keys(changes).filter(stat => (changes[stat].candidate ?? 0) > (changes[stat].current ?? 0));
        if (!relevantStats.length && slot !== "UPGRADE_MODULE" && slot !== "FUEL_TANK") continue;
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
  return changes;
}
