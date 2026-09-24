import type { AdvisorCandidate } from "../../schemas/candidates";
import { advisorContextSchema, type AdvisorContext, type AdvisorConversationState, type AdvisorDomainContext, type AdvisorRoute, type AnalysisDomain, type AvailableAnalysis, type CompactAdvisorCandidate } from "../../schemas/advisor";
import type { ProfileWarning } from "../../schemas/items";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { checkItemRequirements } from "../reference/requirements";
import type { CandidateRelevance } from "./relevance";
import { buildProfileIntelligence, type ProfileIntelligenceSnapshot } from "./profile-intelligence";

export interface TaggedCandidateLane { domain: AnalysisDomain; label: string; candidates: readonly AdvisorCandidate[] }

export function buildAdvisorContext(input: {
  question: string;
  profile: NormalizedSkyBlockProfile;
  route: AdvisorRoute;
  availableAnalysis: AvailableAnalysis;
  candidates: readonly AdvisorCandidate[];
  relevanceById?: ReadonlyMap<string, CandidateRelevance>;
  budgetCoins?: number;
  conversationState?: AdvisorConversationState;
  intelligence?: ProfileIntelligenceSnapshot;
  domainContext?: AdvisorDomainContext | null;
}): AdvisorContext {
  const intelligence = input.intelligence ?? buildProfileIntelligence(input.profile);
  return advisorContextSchema.parse({
    question: input.question, route: input.route, conversationState: input.conversationState ?? null, availableAnalysis: input.availableAnalysis,
    canonical: intelligence.canonical,
    domainContext: input.domainContext === undefined ? (input.route.domain ? intelligence.domains[input.route.domain] : null) : input.domainContext,
    candidates: input.candidates.map(candidate => ({ id: candidate.id, domain: candidate.domain, name: candidate.item.name,
      rarity: candidate.item.rarity, categories: candidate.item.categories, stats: candidate.item.stats, price: candidate.price ?? null,
      knownChanges: candidate.knownChanges ?? {}, requirements: candidate.requirements, abilityText: candidate.abilityText,
      setBonusText: candidate.setBonusText, warnings: candidate.warnings,
      relevance: input.relevanceById?.get(candidate.id) ?? { reason: "Selected by active goal relevance.", relevantStats: Object.keys(candidate.knownChanges ?? {}) },
      feasibility: buildCandidateFeasibility(candidate, input.profile, input.budgetCoins ?? input.conversationState?.budgetCoins),
    })),
    warnings: compactProfileWarnings(input.profile.warnings),
  });
}

export function buildCandidateFeasibility(candidate: AdvisorCandidate, profile: NormalizedSkyBlockProfile, budgetCoins?: number): CompactAdvisorCandidate["feasibility"] {
  const priceCoins = candidate.price?.coins ?? null;
  const priceStatus = budgetCoins === undefined ? "NO_BUDGET" as const : priceCoins === null ? "UNKNOWN" as const
    : priceCoins <= budgetCoins ? "WITHIN_BUDGET" as const : "OVER_BUDGET" as const;
  const requirements: CompactAdvisorCandidate["feasibility"]["requirements"] = checkItemRequirements(candidate.item, profile).map(check => {
    const requirement = check.requirement;
    const required = "tier" in requirement ? requirement.tier : "floor" in requirement ? requirement.floor : requirement.level;
    const detail = requirementDetail(requirement);
    return { text: requirement.sourceText, ...detail, current: check.actual, required,
      gap: check.actual === null ? null : Math.max(required - check.actual, 0), status: check.status };
  });
  requirements.push(...candidate.item.unparsedRequirementText.map(text => ({ text, type: "UNKNOWN" as const, subject: null,
    current: null, required: null, gap: null, status: "UNKNOWN" as const })));
  const statuses = new Set(requirements.map(requirement => requirement.status));
  const requirementStatus = statuses.size === 0 || (statuses.size === 1 && statuses.has("MET")) ? "MET" as const
    : statuses.size === 1 && statuses.has("NOT_MET") ? "NOT_MET" as const
      : statuses.size === 1 && statuses.has("UNKNOWN") ? "UNKNOWN" as const : "MIXED" as const;
  return { priceStatus, budgetCoins: budgetCoins ?? null, priceCoins,
    budgetDeltaCoins: budgetCoins === undefined || priceCoins === null ? null : priceCoins - budgetCoins,
    overBudgetPercent: budgetCoins === undefined || priceCoins === null || budgetCoins <= 0 ? null : Math.max(priceCoins - budgetCoins, 0) / budgetCoins * 100,
    requirementStatus, requirements };
}

function requirementDetail(requirement: AdvisorCandidate["item"]["requirements"][number]) {
  if (requirement.kind === "SKILL_LEVEL") return { type: "SKILL" as const, subject: requirement.skill };
  if (requirement.kind === "SLAYER_LEVEL") return { type: "SLAYER" as const, subject: requirement.slayer };
  if (requirement.kind === "DUNGEON_LEVEL") return { type: "DUNGEON_LEVEL" as const, subject: "catacombs" };
  if (requirement.kind === "DUNGEON_FLOOR") return { type: "DUNGEON_FLOOR" as const, subject: "normal" };
  if (requirement.kind === "HEART_OF_THE_MOUNTAIN") return { type: "HEART_OF_THE_MOUNTAIN" as const, subject: null };
  return { type: "GARDEN_LEVEL" as const, subject: null };
}

export function selectDetailedCandidates(lanes: readonly TaggedCandidateLane[], cap = 32): AdvisorCandidate[] {
  return orderDetailedCandidates(lanes).slice(0, Math.min(cap, 32));
}

export function orderDetailedCandidates(lanes: readonly TaggedCandidateLane[]): AdvisorCandidate[] {
  const queues = lanes.map(lane => [...lane.candidates.filter(candidate => !isNoOpPetCandidate(candidate))]), result: AdvisorCandidate[] = [], seen = new Set<string>();
  let advanced = true;
  while (advanced) {
    advanced = false;
    for (const queue of queues) {
      const candidate = queue.shift();
      if (!candidate) continue;
      advanced = true;
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id); result.push(candidate);
    }
  }
  return result;
}

export function isNoOpPetCandidate(candidate: AdvisorCandidate) {
  if (candidate.domain !== "pet") return false;
  const changes = Object.values(candidate.knownChanges ?? {});
  return changes.length > 0 && changes.every(change => change.current === change.candidate);
}

export function compactProfileWarnings(warnings: readonly ProfileWarning[]): string[] {
  const unknownStats = warnings.filter(warning => warning.code === "UNKNOWN_ITEM_STAT").length;
  const unknownCategories = warnings.filter(warning => warning.code === "UNKNOWN_ITEM_CATEGORY").length;
  const useful = warnings.filter(warning => warning.code !== "UNKNOWN_ITEM_STAT" && warning.code !== "UNKNOWN_ITEM_CATEGORY")
    .map(warning => warning.message).filter((message, index, values) => values.indexOf(message) === index);
  if (unknownStats || unknownCategories) useful.push(`Profile normalization encountered ${unknownStats} unknown stat label${unknownStats === 1 ? "" : "s"} and ${unknownCategories} unknown item categor${unknownCategories === 1 ? "y" : "ies"}; raw item text was preserved.`);
  return useful;
}
