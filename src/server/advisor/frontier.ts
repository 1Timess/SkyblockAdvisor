import type { AdvisorRoute, CompactAdvisorCandidate } from "../../schemas/advisor";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { CandidateRelevance } from "./relevance";

export type SelectionBucket = "ACTIONABLE" | "MONEY_GATED" | "PROGRESSION_GATED" | "DISTANT_OR_UNCERTAIN";
export type ExclusionReason = "REDUNDANCY_LIMIT" | "BUCKET_LIMIT" | "FINAL_CAP" | "LOWER_CONTEXT_PRIORITY" | "NO_OP" | "OTHER";

export interface FrontierInputCandidate {
  candidate: AdvisorCandidate;
  relevance: CandidateRelevance;
  feasibility: CompactAdvisorCandidate["feasibility"];
  sourceLanes: string[];
  stableOrder: number;
}

export interface FrontierSelectionCandidate extends FrontierInputCandidate {
  selection: {
    bucket: SelectionBucket;
    selected: boolean;
    reason: string;
    redundancyKey: string;
    priorityFacts: {
      positiveBudgetGap: number | null;
      unmetRequirementCount: number;
      unknownRequirementCount: number;
      knownRequirementGaps: Array<{ type: string; subject: string | null; gap: number }>;
      relevantEvidenceCount: number;
    };
    exclusionReason: ExclusionReason | null;
  };
}

const broadBucketLimits: Record<SelectionBucket, number> = {
  ACTIONABLE: 12, MONEY_GATED: 8, PROGRESSION_GATED: 8, DISTANT_OR_UNCERTAIN: 4,
};
const bucketOrder: SelectionBucket[] = ["ACTIONABLE", "MONEY_GATED", "PROGRESSION_GATED", "DISTANT_OR_UNCERTAIN"];

export function selectProgressionFrontier(input: { candidates: readonly FrontierInputCandidate[]; route: AdvisorRoute; cap?: number }) {
  const cap = Math.min(input.cap ?? 32, 32);
  const broadGear = input.route.scope === "GEAR" && input.route.goal === "GENERAL_UPGRADE";
  const domainNarrow = input.route.activeDomains.every(domain => domain === "ACCESSORIES" || domain === "PETS");
  const limits = broadGear ? broadBucketLimits : { ACTIONABLE: cap, MONEY_GATED: cap, PROGRESSION_GATED: cap, DISTANT_OR_UNCERTAIN: domainNarrow ? cap : 8 };
  const annotated = input.candidates.map(candidate => annotate(candidate));
  const selected: FrontierSelectionCandidate[] = [];
  const mutationLimit = Math.min(6, cap), mutationCounts = new Map<string, number>();
  const armorSlotCounts = new Map<string, number>(), distantArmorSlotCounts = new Map<string, number>(), redundancyCounts = new Map<string, number>();

  for (const bucket of bucketOrder) {
    const ordered = annotated.filter(candidate => candidate.selection.bucket === bucket).sort(compareContextPriority);
    let bucketSelected = 0;
    for (const candidate of ordered) {
      if (selected.length >= cap) {
        reject(candidate, "FINAL_CAP", "Not selected because the final context ceiling was reached.");
        continue;
      }
      if (bucketSelected >= limits[bucket]) {
        reject(candidate, "BUCKET_LIMIT", `Not selected because the ${bucket} context ceiling was reached.`);
        continue;
      }
      if (candidate.candidate.mutation) {
        const mutationCount = mutationCounts.get(candidate.candidate.mutation.kind) ?? 0;
        if (mutationCount >= mutationLimit) {
          reject(candidate, "REDUNDANCY_LIMIT", `Not selected because ${candidate.candidate.mutation.kind.toLowerCase()} mutations already have ${mutationLimit} representative context slots.`);
          continue;
        }
      }
      const redundancyReason = redundancyLimitReason(candidate, { broadGear, domainNarrow, armorSlotCounts, distantArmorSlotCounts, redundancyCounts });
      if (redundancyReason) {
        reject(candidate, "REDUNDANCY_LIMIT", redundancyReason);
        continue;
      }
      candidate.selection.selected = true;
      candidate.selection.reason = `Selected as a representative ${bucket.toLowerCase().replaceAll("_", " ")} candidate by lexicographic context priority.`;
      selected.push(candidate); bucketSelected++;
      if (candidate.candidate.mutation) mutationCounts.set(candidate.candidate.mutation.kind, (mutationCounts.get(candidate.candidate.mutation.kind) ?? 0) + 1);
      recordRedundancy(candidate, armorSlotCounts, distantArmorSlotCounts, redundancyCounts);
    }
  }
  return { selected, candidates: annotated };
}

function annotate(input: FrontierInputCandidate): FrontierSelectionCandidate {
  const unmet = input.feasibility.requirements.filter(requirement => requirement.status === "NOT_MET");
  const unknown = input.feasibility.requirements.filter(requirement => requirement.status === "UNKNOWN");
  const bucket = classifyBucket(input, unmet.length, unknown.length);
  const knownRequirementGaps = unmet.flatMap(requirement => requirement.gap === null ? [] : [{ type: requirement.type, subject: requirement.subject, gap: requirement.gap }])
    .sort((left, right) => `${left.type}:${left.subject ?? ""}`.localeCompare(`${right.type}:${right.subject ?? ""}`) || left.gap - right.gap);
  const relevantEvidenceCount = input.relevance.relevantStats.length + (input.sourceLanes.some(lane => lane.endsWith(":ability")) ? 1 : 0);
  const redundancyKey = structuralKey(input, bucket);
  return { ...input, selection: { bucket, selected: false, reason: "Awaiting context-budget selection.", redundancyKey,
    priorityFacts: { positiveBudgetGap: input.feasibility.budgetDeltaCoins !== null && input.feasibility.budgetDeltaCoins > 0 ? input.feasibility.budgetDeltaCoins : null,
      unmetRequirementCount: unmet.length, unknownRequirementCount: unknown.length, knownRequirementGaps, relevantEvidenceCount }, exclusionReason: null } };
}

function classifyBucket(input: FrontierInputCandidate, unmetCount: number, unknownCount: number): SelectionBucket {
  if (unknownCount > 0 || input.feasibility.priceStatus === "UNKNOWN") return "DISTANT_OR_UNCERTAIN";
  if (unmetCount > 0) return "PROGRESSION_GATED";
  if (input.candidate.warnings.some(warning => warning.includes("owned armor baseline for this slot is unknown")
    || warning.includes("owned equipment baseline for this slot is unknown"))) return "DISTANT_OR_UNCERTAIN";
  if (input.feasibility.priceStatus === "OVER_BUDGET") return "MONEY_GATED";
  return "ACTIONABLE";
}

function compareContextPriority(left: FrontierSelectionCandidate, right: FrontierSelectionCandidate) {
  if (left.candidate.mutation && right.candidate.mutation) {
    if (left.candidate.mutation.impactPriority !== right.candidate.mutation.impactPriority) {
      return left.candidate.mutation.impactPriority - right.candidate.mutation.impactPriority;
    }
    const operationRank = { FILL: 0, UNLOCK_AND_FILL: 1, UPGRADE_QUALITY: 2 } as const;
    const operationDifference = operationRank[left.candidate.mutation.operation] - operationRank[right.candidate.mutation.operation];
    if (operationDifference) return operationDifference;
    const leftGain = mutationRelativeGain(left.candidate), rightGain = mutationRelativeGain(right.candidate);
    if (leftGain !== rightGain) return rightGain - leftGain;
  }
  const leftFacts = left.selection.priorityFacts, rightFacts = right.selection.priorityFacts;
  if (leftFacts.unknownRequirementCount !== rightFacts.unknownRequirementCount) return leftFacts.unknownRequirementCount - rightFacts.unknownRequirementCount;
  const leftFamily = requirementFamilyKey(left), rightFamily = requirementFamilyKey(right);
  if (leftFamily === rightFamily) {
    const gap = compareGapVectors(leftFacts.knownRequirementGaps.map(value => value.gap), rightFacts.knownRequirementGaps.map(value => value.gap));
    if (gap) return gap;
  }
  const leftBudget = leftFacts.positiveBudgetGap ?? Number.POSITIVE_INFINITY;
  const rightBudget = rightFacts.positiveBudgetGap ?? Number.POSITIVE_INFINITY;
  if (leftBudget !== rightBudget) return leftBudget - rightBudget;
  if (leftFacts.relevantEvidenceCount !== rightFacts.relevantEvidenceCount) return rightFacts.relevantEvidenceCount - leftFacts.relevantEvidenceCount;
  return left.stableOrder - right.stableOrder || left.candidate.id.localeCompare(right.candidate.id);
}

function compareGapVectors(left: number[], right: number[]) {
  const size = Math.max(left.length, right.length);
  for (let index = 0; index < size; index++) {
    const difference = (left[index] ?? Number.POSITIVE_INFINITY) - (right[index] ?? Number.POSITIVE_INFINITY);
    if (difference) return difference;
  }
  return 0;
}

function requirementFamilyKey(candidate: FrontierSelectionCandidate) {
  return candidate.selection.priorityFacts.knownRequirementGaps.map(value => `${value.type}:${value.subject ?? ""}`).sort().join("|");
}

function structuralKey(input: FrontierInputCandidate, bucket: SelectionBucket) {
  if (input.candidate.mutation) return `mutation:${input.candidate.mutation.kind}:${input.candidate.mutation.parentItemKey}:${input.candidate.mutation.operation}:${bucket}`;
  const evidence = [...input.relevance.relevantStats].sort().join("+") || (input.sourceLanes.some(lane => lane.endsWith(":ability")) ? "ability" : "progression");
  if (input.candidate.domain === "armor") return `armor:${armorSlot(input.candidate) ?? "unknown"}:${evidence}:${bucket}`;
  if (input.candidate.domain === "weapon") return `weapon:${weaponCategory(input.candidate)}:${evidence}:${bucket}`;
  return `${input.candidate.domain}:${evidence}:${bucket}`;
}

function redundancyLimitReason(candidate: FrontierSelectionCandidate, state: {
  broadGear: boolean; domainNarrow: boolean; armorSlotCounts: Map<string, number>; distantArmorSlotCounts: Map<string, number>; redundancyCounts: Map<string, number>;
}) {
  if (state.domainNarrow) return null;
  const keyCount = state.redundancyCounts.get(candidate.selection.redundancyKey) ?? 0;
  const itemUpgrade = candidate.candidate.item.categories.includes("item_upgrade");
  const keyLimit = candidate.candidate.mutation ? 1 : itemUpgrade ? 4 : candidate.selection.bucket === "DISTANT_OR_UNCERTAIN" ? 1 : candidate.candidate.domain === "armor" ? 3 : candidate.candidate.domain === "weapon" ? 2 : 1;
  if (keyCount >= keyLimit) return `Structurally similar candidates already represent ${candidate.selection.redundancyKey}.`;
  if (candidate.candidate.domain !== "armor" || !state.broadGear) return null;
  const slot = armorSlot(candidate.candidate) ?? "unknown";
  if ((state.armorSlotCounts.get(slot) ?? 0) >= 3) return `The broad gear context already contains three representatives for the ${slot} slot.`;
  if (candidate.selection.bucket === "DISTANT_OR_UNCERTAIN" && (state.distantArmorSlotCounts.get(slot) ?? 0) >= 1) {
    return `The broad gear context already contains a distant representative for the ${slot} slot.`;
  }
  return null;
}

function recordRedundancy(candidate: FrontierSelectionCandidate, armorSlots: Map<string, number>, distantArmorSlots: Map<string, number>, keys: Map<string, number>) {
  keys.set(candidate.selection.redundancyKey, (keys.get(candidate.selection.redundancyKey) ?? 0) + 1);
  if (candidate.candidate.domain !== "armor") return;
  const slot = armorSlot(candidate.candidate) ?? "unknown";
  armorSlots.set(slot, (armorSlots.get(slot) ?? 0) + 1);
  if (candidate.selection.bucket === "DISTANT_OR_UNCERTAIN") distantArmorSlots.set(slot, (distantArmorSlots.get(slot) ?? 0) + 1);
}

function mutationRelativeGain(candidate: AdvisorCandidate) {
  const changes = Object.values(candidate.knownChanges ?? {}).filter(change => change.current !== null && change.candidate !== null);
  if (!changes.length) return 0;
  return Math.max(...changes.map(change => Math.abs((change.candidate ?? 0) - (change.current ?? 0)) / Math.max(Math.abs(change.candidate ?? 0), 1)));
}

function reject(candidate: FrontierSelectionCandidate, exclusionReason: ExclusionReason, reason: string) {
  candidate.selection.exclusionReason = exclusionReason;
  candidate.selection.reason = reason;
}

function armorSlot(candidate: AdvisorCandidate) { return ["helmet", "chestplate", "leggings", "boots"].find(slot => candidate.item.categories.includes(slot)); }
function weaponCategory(candidate: AdvisorCandidate) { return ["sword", "bow", "wand", "fishing_rod"].find(category => candidate.item.categories.includes(category)) ?? "weapon"; }
