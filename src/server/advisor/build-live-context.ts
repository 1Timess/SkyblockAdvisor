import type { AdvisorContext, AdvisorConversationState, AdvisorRoute, AnalysisScope, AvailableAnalysis, ProfileIntelligenceDomain } from "../../schemas/advisor";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import { hypixelClient } from "../hypixel/client";
import { loadMarketSnapshot } from "../market/snapshot-store";
import { buildAccessoryCatalog } from "../reference/accessory-data";
import { buildItemCatalog } from "../reference/item-catalog";
import { loadNeuRepository } from "../reference/neu/repository";
import { buildPetCandidateCatalog } from "../reference/pet-catalog";
import { buildAccessoryLanes } from "../candidates/accessory";
import { buildArmorLanes } from "../candidates/armor";
import { buildActivityDomainLanes } from "../candidates/domain";
import { buildPetLanes } from "../candidates/pet";
import { buildWeaponLanes } from "../candidates/weapon";
import { buildAdvisorContext, buildCandidateFeasibility, compactProfileWarnings, isNoOpPetCandidate, orderDetailedCandidates, type TaggedCandidateLane } from "./context";
import { advisorProfileSnapshotCache } from "./profile-intelligence";
import { routeAdvisorQuestion } from "./routing";
import { buildCandidateRelevance, filterCandidateLanesForGoal, mergeCandidateEvidence, uniqueLaneCandidates } from "./relevance";
import { selectProgressionFrontier, type ExclusionReason, type FrontierSelectionCandidate, type SelectionBucket } from "./frontier";

export interface AdvisorContextDiagnostics {
  profileWarningCount: number; compactWarningCount: number; petOwnedCount: number; petUniqueTypeCount: number; petDuplicateCount: number;
  level100RabbitDetected: boolean; rabbitLowerLevelTargetSuppressed: boolean; rabbitNoOpSuppressed: boolean;
  rawActiveScopeCandidateCount: number; goalRelevantCandidateCount: number;
  removedByRelevance: Array<{ id: string; domain: AdvisorCandidate["domain"]; name: string; sourceLanes: string[]; reason: string }>;
  selectedBucketCounts: Record<SelectionBucket, number>; exclusionCounts: Record<ExclusionReason, number>; unselectedGoalRelevantCount: number;
  cacheReused: boolean; snapshotId: string; canonicalIncluded: true; includedDomain: ProfileIntelligenceDomain | null; excludedDomains: ProfileIntelligenceDomain[];
}
export interface AdvisorContextBuildResult {
  context: AdvisorContext; route: AdvisorRoute; availableAnalysis: AvailableAnalysis; detailedCandidates: AdvisorCandidate[];
  candidateLanes: Record<string, string[]>; rawScopeCandidates: Array<{ candidateId: string; domain: AdvisorCandidate["domain"]; name: string; sourceLanes: string[] }>;
  frontierCandidates: FrontierSelectionCandidate[]; diagnostics: AdvisorContextDiagnostics; nextConversationState: AdvisorConversationState;
}
export interface BuildAdvisorContextInput {
  usernameOrUuid: string; requestedProfile?: string; question: string; budgetCoins?: number; rolePetTypes?: readonly string[];
  conversationState?: AdvisorConversationState;
}

export async function buildAdvisorContextForPlayer(input: BuildAdvisorContextInput): Promise<AdvisorContext> { return (await buildAdvisorContextInspectionForPlayer(input)).context; }

export async function buildAdvisorContextInspectionForPlayer(input: BuildAdvisorContextInput): Promise<AdvisorContextBuildResult> {
  const profileResultPromise = advisorProfileSnapshotCache.getOrLoad({ usernameOrUuid: input.usernameOrUuid, requestedProfile: input.requestedProfile,
    profileSnapshotId: input.conversationState?.profileSnapshotId });
  const [profileResult, items, neu, market] = await Promise.all([profileResultPromise, hypixelClient.getItems(), loadNeuRepository(), loadMarketSnapshot()]);
  const intelligence = profileResult.snapshot, profile = intelligence.profile;
  const route = routeAdvisorQuestion({ question: input.question, profile, conversationState: input.conversationState });
  const effectiveBudgetCoins = input.budgetCoins ?? input.conversationState?.budgetCoins;
  const catalog = buildItemCatalog(items, neu).getAll(), quotes = new Map<string, MarketQuote>(Object.entries(market?.quotes ?? {}));
  const eligibilityMode = "ADVISOR_DISCOVERY" as const;
  const lanes: TaggedCandidateLane[] = [];
  let petLevelTarget: AdvisorCandidate[] = [], rabbitNoOpInRawLanes = false;

  if (route.domain === "DUNGEONS") {
    for (const current of profile.gear.armor.items) {
      const result = buildArmorLanes({ current, catalog, profile, quotes, budgetCoins: effectiveBudgetCoins, eligibilityMode });
      lanes.push(...Object.entries(result.discovery.lanes).map(([lane, candidates]) => ({ domain: "ARMOR" as const, label: `armor:${result.slot}:${lane}`, candidates })));
    }
    for (const current of profile.gear.weapons) {
      const result = buildWeaponLanes({ current, catalog, profile, quotes, budgetCoins: effectiveBudgetCoins, eligibilityMode });
      lanes.push(...Object.entries(result.discovery.lanes).map(([lane, candidates]) => ({ domain: "WEAPONS" as const, label: `weapon:${current.id ?? current.name}:${lane}`, candidates })));
    }
  } else if (route.domain === "ACCESSORIES") {
    const result = buildAccessoryLanes({ profile, catalog, references: buildAccessoryCatalog(items), quotes, budgetCoins: effectiveBudgetCoins, eligibilityMode });
    lanes.push(...Object.entries(result.lanes).map(([lane, candidates]) => ({ domain: "ACCESSORIES" as const, label: `accessory:${lane}`, candidates })));
  } else if (route.domain === "FISHING" || route.domain === "MINING") {
    const activityDomain = route.domain;
    const result = buildActivityDomainLanes({ domain: activityDomain, profile, catalog, quotes, budgetCoins: effectiveBudgetCoins });
    lanes.push(...Object.entries(result).map(([lane, candidates]) => ({ domain: activityDomain, label: `${activityDomain.toLowerCase()}:${lane}`, candidates })));
  } else if (route.scope === "PETS") {
    const result = buildPetLanes({ profile, catalog: buildPetCandidateCatalog(neu), quotes, budgetCoins: effectiveBudgetCoins,
      rolePetTypes: input.rolePetTypes, eligibilityMode });
    petLevelTarget = result.lanes.levelTarget;
    const petLanes = Object.entries(result.lanes).map(([lane, candidates]) => ({ domain: "PETS" as const, label: `pet:${lane}`, candidates }));
    rabbitNoOpInRawLanes = petLanes.some(lane => lane.candidates.some(candidate => candidate.id.toUpperCase().startsWith("RABBIT;") && isNoOpPetCandidate(candidate)));
    lanes.push(...petLanes);
  }

  const scopedLanes = scopeCandidateLanes(lanes, route), relevantLanes = filterCandidateLanesForGoal(scopedLanes, route);
  const rawScopedCandidates = uniqueLaneCandidates(scopedLanes).filter(candidate => !isNoOpPetCandidate(candidate));
  const relevantCandidates = orderDetailedCandidates(relevantLanes).map(candidate => mergeCandidateEvidence(candidate, relevantLanes));
  const meaningful = (domain: TaggedCandidateLane["domain"]) => uniqueCandidates(lanes.filter(lane => lane.domain === domain).flatMap(lane => lane.candidates).filter(candidate => !isNoOpPetCandidate(candidate)));
  const availableAnalysis: AvailableAnalysis = {
    armor: { available: profile.gear.armor.items.length > 0, candidateCount: meaningful("ARMOR").length },
    weapons: { available: profile.gear.weapons.length > 0, candidateCount: meaningful("WEAPONS").length },
    accessories: { available: profile.accessories.owned.length > 0 || profile.accessories.missing.length > 0, candidateCount: meaningful("ACCESSORIES").length,
      currentMagicalPower: profile.accessories.magicalPower.total, missingCount: profile.accessories.missing.length, upgradeCount: profile.accessories.upgrades.length },
    pets: { available: profile.pets.owned.length > 0, candidateCount: meaningful("PETS").length, ownedCount: profile.pets.owned.length },
    dungeons: { available: profile.progression.dungeons.catacombs !== null, candidateCount: meaningful("ARMOR").length + meaningful("WEAPONS").length },
    fishing: { available: profile.progression.skills.fishing !== undefined || profile.inventoryItems.some(item => item.categories.includes("fishing_rod")), candidateCount: meaningful("FISHING").length },
    mining: { available: profile.progression.skills.mining !== undefined || profile.inventoryItems.some(item => item.categories.includes("pickaxe") || item.categories.includes("drill")), candidateCount: meaningful("MINING").length },
  };
  const frontier = selectProgressionFrontier({ route, candidates: relevantCandidates.map((candidate, stableOrder) => ({ candidate, stableOrder,
    relevance: buildCandidateRelevance(relevantLanes, candidate.id, route), feasibility: buildCandidateFeasibility(candidate, profile, effectiveBudgetCoins),
    sourceLanes: relevantLanes.filter(lane => lane.candidates.some(value => value.id === candidate.id)).map(lane => lane.label) })) });
  const detailedCandidates = frontier.selected.map(candidate => candidate.candidate);
  const relevanceById = new Map(frontier.selected.map(candidate => [candidate.candidate.id, candidate.relevance]));
  const nextConversationState: AdvisorConversationState = {
    ...input.conversationState, profileSnapshotId: intelligence.snapshotId, budgetCoins: effectiveBudgetCoins,
    previousDomain: input.conversationState?.currentDomain, currentDomain: route.domain ?? input.conversationState?.currentDomain,
    previousGoal: input.conversationState?.goal, goal: route.goal,
    role: explicitRole(input.question) ?? input.conversationState?.role,
    activeScopes: [route.scope],
  };
  const context = buildAdvisorContext({ question: input.question, profile, intelligence, route, availableAnalysis, candidates: detailedCandidates,
    conversationState: nextConversationState, relevanceById, budgetCoins: effectiveBudgetCoins,
    domainContext: route.domain ? intelligence.domains[route.domain] : null });
  const candidateLanes = Object.fromEntries(detailedCandidates.map(candidate => [candidate.id, relevantLanes.filter(lane => lane.candidates.some(value => value.id === candidate.id)).map(lane => lane.label)]));
  const rabbitPets = profile.pets.owned.filter(pet => pet.type.toUpperCase() === "RABBIT"), petUniqueTypeCount = new Set(profile.pets.owned.map(pet => pet.type)).size;
  const level100RabbitDetected = rabbitPets.some(pet => pet.level !== null && pet.maxLevel !== null && pet.level >= pet.maxLevel);
  const lowerRabbitDetected = rabbitPets.some(pet => pet.level !== null && pet.maxLevel !== null && pet.level < pet.maxLevel);
  const relevantIds = new Set(relevantCandidates.map(candidate => candidate.id));
  const removedByRelevance = rawScopedCandidates.filter(candidate => !relevantIds.has(candidate.id)).map(candidate => ({ id: candidate.id, domain: candidate.domain,
    name: candidate.item.name, sourceLanes: scopedLanes.filter(lane => lane.candidates.some(value => value.id === candidate.id)).map(lane => lane.label), reason: "Only appeared in lanes irrelevant to the active goal." }));
  const buckets: SelectionBucket[] = ["ACTIONABLE", "MONEY_GATED", "PROGRESSION_GATED", "DISTANT_OR_UNCERTAIN"];
  const exclusions: ExclusionReason[] = ["REDUNDANCY_LIMIT", "BUCKET_LIMIT", "FINAL_CAP", "LOWER_CONTEXT_PRIORITY", "NO_OP", "OTHER"];
  const allDomains: ProfileIntelligenceDomain[] = ["DUNGEONS", "ACCESSORIES", "FISHING", "MINING"];
  return { context, route, availableAnalysis, detailedCandidates, candidateLanes, frontierCandidates: frontier.candidates,
    rawScopeCandidates: rawScopedCandidates.map(candidate => ({ candidateId: candidate.id, domain: candidate.domain, name: candidate.item.name,
      sourceLanes: scopedLanes.filter(lane => lane.candidates.some(value => value.id === candidate.id)).map(lane => lane.label) })), nextConversationState,
    diagnostics: { profileWarningCount: profile.warnings.length, compactWarningCount: compactProfileWarnings(profile.warnings).length,
      petOwnedCount: profile.pets.owned.length, petUniqueTypeCount, petDuplicateCount: profile.pets.owned.length - petUniqueTypeCount,
      level100RabbitDetected, rabbitLowerLevelTargetSuppressed: level100RabbitDetected && lowerRabbitDetected && !petLevelTarget.some(candidate => candidate.id.toUpperCase().startsWith("RABBIT;")),
      rabbitNoOpSuppressed: rabbitNoOpInRawLanes && !detailedCandidates.some(candidate => candidate.id.toUpperCase().startsWith("RABBIT;") && isNoOpPetCandidate(candidate)),
      rawActiveScopeCandidateCount: rawScopedCandidates.length, goalRelevantCandidateCount: relevantCandidates.length, removedByRelevance,
      selectedBucketCounts: Object.fromEntries(buckets.map(bucket => [bucket, frontier.selected.filter(candidate => candidate.selection.bucket === bucket).length])) as Record<SelectionBucket, number>,
      exclusionCounts: Object.fromEntries(exclusions.map(reason => [reason, frontier.candidates.filter(candidate => candidate.selection.exclusionReason === reason).length])) as Record<ExclusionReason, number>,
      unselectedGoalRelevantCount: frontier.candidates.filter(candidate => !candidate.selection.selected).length,
      cacheReused: profileResult.cacheReused, snapshotId: intelligence.snapshotId, canonicalIncluded: true, includedDomain: route.domain,
      excludedDomains: allDomains.filter(domain => domain !== route.domain) } };
}

export function scopeCandidateLanes(lanes: readonly TaggedCandidateLane[], route: AdvisorRoute): TaggedCandidateLane[] {
  const domainScoped = lanes.filter(lane => route.activeDomains.includes(lane.domain));
  if (route.scope === "CLARIFY") return [];
  if (route.scope === "ARMOR" && route.armorSlots.length) return domainScoped.filter(lane => route.armorSlots.some(slot => lane.label.startsWith(`armor:${slot}:`)));
  const allowed = laneNamesForScope(route.scope);
  return domainScoped.flatMap(lane => {
    const laneName = lane.label.slice(lane.label.lastIndexOf(":") + 1);
    if (allowed && !allowed.has(laneName)) return [];
    if (route.scope === "ARCHER" && lane.domain === "WEAPONS") return [{ ...lane, candidates: lane.candidates.filter(candidate => candidate.item.categories.includes("bow")) }];
    if (route.scope === "BERSERK" && lane.domain === "WEAPONS") return [{ ...lane, candidates: lane.candidates.filter(candidate => candidate.item.categories.includes("sword")) }];
    return [lane];
  });
}
function laneNamesForScope(scope: AnalysisScope): ReadonlySet<string> | null {
  if (scope === "SURVIVABILITY") return new Set(["defense", "health"]); if (scope === "DAMAGE") return new Set(["damage", "strength", "critDamage", "attackSpeed", "ability"]);
  if (scope === "MAGE") return new Set(["intelligence", "ability"]); if (scope === "ARCHER" || scope === "BERSERK") return new Set(["damage", "strength", "critDamage", "attackSpeed", "ability"]); return null;
}
function uniqueCandidates(candidates: readonly AdvisorCandidate[]) { return [...new Map(candidates.map(candidate => [candidate.id, candidate])).values()]; }
function explicitRole(question: string): AdvisorConversationState["role"] {
  const text = question.toLowerCase(); if (/\bmage\b/.test(text)) return "mage"; if (/\barcher\b/.test(text)) return "archer";
  if (/\bberserk\b|\bmelee\b/.test(text)) return "berserk"; if (/\btank\b/.test(text)) return "tank"; if (/\bhealer\b/.test(text)) return "healer"; return undefined;
}
