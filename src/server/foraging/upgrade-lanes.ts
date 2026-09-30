import type { CandidateItem } from "../../schemas/catalog";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { prepareCandidate } from "../candidates/common";

const axeOrder = ["SERIOUSLY_DAMAGED_AXE", "FIG_AXE", "FIGSTONE_AXE", "HELIX_CHOPPER"] as const;
const armorTiers = ["FIG_ARMOR", "HELIX_ARMOR"] as const;
const armorSlots = ["HELMET", "CHESTPLATE", "LEGGINGS", "BOOTS"] as const;
const equipmentLanes = {
  necklace: ["MANGROVE_LOCKET", "HONEYCOMB_NECKLACE"],
  bracelet: ["MANGROVE_GRIPPERS", "VEILSHROOM_BRACELET"],
  belt: ["MANGROVE_VINE", "MOONGLADE_BELT", "TORRHUS_BELT"],
} as const;
const stats = ["sweep", "foragingFortune", "foragingWisdom"] as const;

export function buildForagingUpgradeLanes(input: {
  profile: NormalizedSkyBlockProfile; catalog: readonly CandidateItem[]; quotes: ReadonlyMap<string, MarketQuote>; budgetCoins?: number;
}): Record<string, AdvisorCandidate[]> {
  const byId = new Map(input.catalog.map(item => [item.id, item]));
  const ownedIds = new Set(input.profile.inventoryItems.flatMap(item => item.id ? [item.id] : []));
  const lanes: Record<string, AdvisorCandidate[]> = { axe: [], helmet: [], chestplate: [], leggings: [], boots: [], necklace: [], bracelet: [], belt: [] };

  const ownedAxeRank = Math.max(-1, ...input.profile.inventoryItems.map(item => item.id ? axeOrder.indexOf(item.id as typeof axeOrder[number]) : -1));
  for (let rank = ownedAxeRank + 1; rank < axeOrder.length; rank++) {
    const item = byId.get(axeOrder[rank]); if (!item) continue;
    const candidate = prepareCandidate("tool", item, input.profile, input.quotes,
      { budgetCoins: input.budgetCoins, ownedItemIds: ownedIds, eligibilityMode: "ADVISOR_DISCOVERY" });
    if (candidate) lanes.axe.push(withChanges(candidate, bestOwned(input.profile, axeOrder), rank - ownedAxeRank));
  }

  for (const slot of armorSlots) {
    const lane = slot.toLowerCase();
    const ids = armorTiers.map(tier => `${tier}_${slot}`);
    const ownedRank = Math.max(-1, ...input.profile.inventoryItems.map(item => item.id ? ids.indexOf(item.id) : -1));
    for (let rank = ownedRank + 1; rank < ids.length; rank++) {
      const item = byId.get(ids[rank]); if (!item) continue;
      const candidate = prepareCandidate("armor", item, input.profile, input.quotes,
        { budgetCoins: input.budgetCoins, ownedItemIds: ownedIds, eligibilityMode: "ADVISOR_DISCOVERY" });
      if (candidate) lanes[lane].push(withChanges(candidate, bestOwned(input.profile, ids), rank - ownedRank));
    }
  }
  for (const [lane, ids] of Object.entries(equipmentLanes)) {
    const ownedRank = Math.max(-1, ...input.profile.inventoryItems.map(item => item.id ? ids.indexOf(item.id as never) : -1));
    for (let rank = ownedRank + 1; rank < ids.length; rank++) {
      const item = byId.get(ids[rank]); if (!item) continue;
      const candidate = prepareCandidate("accessory", item, input.profile, input.quotes,
        { budgetCoins: input.budgetCoins, ownedItemIds: ownedIds, eligibilityMode: "ADVISOR_DISCOVERY" });
      if (candidate) {
        const familyCurrent = bestOwned(input.profile, ids);
        const slotCurrent = bestObservedEquipmentSlot(input.profile, lane) ?? familyCurrent;
        lanes[lane].push(withChanges(candidate, slotCurrent, rank - ownedRank, equipmentSemanticEvidence(candidate.id)));
      }
    }
  }

  return lanes;
}

function bestOwned(profile: NormalizedSkyBlockProfile, ids: readonly string[]) {
  const rank = Math.max(-1, ...profile.inventoryItems.map(item => item.id ? ids.indexOf(item.id) : -1));
  return rank < 0 ? null : profile.inventoryItems.find(item => item.id === ids[rank]) ?? null;
}

function bestObservedEquipmentSlot(profile: NormalizedSkyBlockProfile, slot: string) {
  const matches = profile.inventoryItems.filter(item => item.categories.includes("equipment") && item.categories.includes(slot));
  return matches.sort((a, b) => visibleForagingScore(b) - visibleForagingScore(a))[0] ?? null;
}

function visibleForagingScore(item: NormalizedSkyBlockProfile["inventoryItems"][number]) {
  return stats.reduce((total, stat) => total + (item.stats[stat] ?? 0), 0);
}

function equipmentSemanticEvidence(candidateId: string) {
  if (candidateId === "MOONGLADE_BELT") return ["Verified Starlyn Contest point bonus: +5%."];
  if (candidateId === "TORRHUS_BELT") return ["Verified Starlyn Contest point bonus: +10%."];
  return [];
}

function withChanges(candidate: AdvisorCandidate, current: NormalizedSkyBlockProfile["inventoryItems"][number] | null, progressionSteps: number, extraEvidence: readonly string[] = []): AdvisorCandidate {
  const knownChanges: NonNullable<AdvisorCandidate["knownChanges"]> = {};
  for (const stat of stats) {
    const currentValue = current?.stats[stat] ?? null, candidateValue = candidate.item.stats[stat] ?? null;
    if (currentValue !== null || candidateValue !== null) knownChanges[stat] = { current: currentValue, candidate: candidateValue };
  }
  return { ...candidate, knownChanges, semanticEvidence: [...(candidate.semanticEvidence ?? []),
    `Supported Foraging family progression distance from the best observed owned tier: ${progressionSteps} step${progressionSteps === 1 ? "" : "s"}.`,
    ...extraEvidence],
    warnings: [...candidate.warnings,
      "Foraging family order is progression context, not an inferred usage requirement. Only parsed item requirement evidence determines requirement feasibility.",
      "Foraging upgrade comparisons report visible item contributions only; they do not reconstruct effective account Sweep or Foraging Fortune."] };
}
