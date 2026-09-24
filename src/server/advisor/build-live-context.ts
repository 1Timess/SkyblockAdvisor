import type { AdvisorContext, AdvisorConversationState, AdvisorRoute, AnalysisScope, AvailableAnalysis } from "../../schemas/advisor";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import { hypixelClient } from "../hypixel/client";
import { loadMarketSnapshot } from "../market/snapshot-store";
import { buildAccessoryCatalog } from "../reference/accessory-data";
import { buildItemCatalog } from "../reference/item-catalog";
import { loadNeuRepository } from "../reference/neu/repository";
import { buildPetCandidateCatalog } from "../reference/pet-catalog";
import { buildNormalizedProfile } from "../skyblock/profile/build-normalized-profile";
import { buildAccessoryLanes } from "../candidates/accessory";
import { buildArmorLanes } from "../candidates/armor";
import { buildPetLanes } from "../candidates/pet";
import { buildWeaponLanes } from "../candidates/weapon";
import { buildAdvisorContext, buildCandidateFeasibility, compactProfileWarnings, isNoOpPetCandidate, orderDetailedCandidates, type TaggedCandidateLane } from "./context";
import { routeAdvisorQuestion } from "./routing";
import { buildCandidateRelevance, filterCandidateLanesForGoal, mergeCandidateEvidence, uniqueLaneCandidates } from "./relevance";
import { selectProgressionFrontier, type ExclusionReason, type FrontierSelectionCandidate, type SelectionBucket } from "./frontier";

export interface AdvisorContextDiagnostics {
  profileWarningCount: number;
  compactWarningCount: number;
  petOwnedCount: number;
  petUniqueTypeCount: number;
  petDuplicateCount: number;
  level100RabbitDetected: boolean;
  rabbitLowerLevelTargetSuppressed: boolean;
  rabbitNoOpSuppressed: boolean;
  rawActiveScopeCandidateCount: number;
  goalRelevantCandidateCount: number;
  removedByRelevance: Array<{ id: string; domain: AdvisorCandidate["domain"]; name: string; sourceLanes: string[]; reason: string }>;
  selectedBucketCounts: Record<SelectionBucket, number>;
  exclusionCounts: Record<ExclusionReason, number>;
  unselectedGoalRelevantCount: number;
}

export interface AdvisorContextBuildResult {
  context: AdvisorContext;
  route: AdvisorRoute;
  availableAnalysis: AvailableAnalysis;
  detailedCandidates: AdvisorCandidate[];
  candidateLanes: Record<string, string[]>;
  rawScopeCandidates: Array<{ candidateId: string; domain: AdvisorCandidate["domain"]; name: string; sourceLanes: string[] }>;
  frontierCandidates: FrontierSelectionCandidate[];
  diagnostics: AdvisorContextDiagnostics;
}

interface BuildInput {
  usernameOrUuid: string;
  requestedProfile?: string;
  question: string;
  budgetCoins?: number;
  rolePetTypes?: readonly string[];
  conversationState?: AdvisorConversationState;
}

export async function buildAdvisorContextForPlayer(input: BuildInput): Promise<AdvisorContext> {
  return (await buildAdvisorContextInspectionForPlayer(input)).context;
}

export async function buildAdvisorContextInspectionForPlayer(input: BuildInput): Promise<AdvisorContextBuildResult> {
  const [profile, items, neu, snapshot] = await Promise.all([
    buildNormalizedProfile({ usernameOrUuid: input.usernameOrUuid, requestedProfile: input.requestedProfile }),
    hypixelClient.getItems(), loadNeuRepository(), loadMarketSnapshot(),
  ]);
  const catalog = buildItemCatalog(items, neu).getAll();
  const quotes = new Map<string, MarketQuote>(Object.entries(snapshot?.quotes ?? {}));
  const eligibilityMode = "ADVISOR_DISCOVERY" as const;
  const armorResults = profile.gear.armor.items.map(current => buildArmorLanes({ current, catalog, profile, quotes, budgetCoins: input.budgetCoins, eligibilityMode }));
  const weaponResults = profile.gear.weapons.map(current => ({ current: current.id ?? current.name,
    result: buildWeaponLanes({ current, catalog, profile, quotes, budgetCoins: input.budgetCoins, eligibilityMode }) }));
  const accessories = buildAccessoryLanes({ profile, catalog, references: buildAccessoryCatalog(items), quotes, budgetCoins: input.budgetCoins, eligibilityMode });
  const pets = buildPetLanes({ profile, catalog: buildPetCandidateCatalog(neu), quotes, budgetCoins: input.budgetCoins, rolePetTypes: input.rolePetTypes, eligibilityMode });

  const lanes: TaggedCandidateLane[] = [
    ...armorResults.flatMap(result => Object.entries(result.discovery.lanes).map(([lane, candidates]) => ({ domain: "ARMOR" as const, label: `armor:${result.slot}:${lane}`, candidates }))),
    ...weaponResults.flatMap(({ current, result }) => Object.entries(result.discovery.lanes).map(([lane, candidates]) => ({ domain: "WEAPONS" as const, label: `weapon:${current}:${lane}`, candidates }))),
    ...Object.entries(accessories.lanes).map(([lane, candidates]) => ({ domain: "ACCESSORIES" as const, label: `accessory:${lane}`, candidates })),
    ...Object.entries(pets.lanes).map(([lane, candidates]) => ({ domain: "PETS" as const, label: `pet:${lane}`, candidates })),
  ];
  const route = routeAdvisorQuestion({ question: input.question, profile, conversationState: input.conversationState });
  const scopedLanes = scopeCandidateLanes(lanes, route);
  const relevantLanes = filterCandidateLanesForGoal(scopedLanes, route);
  const rawScopedCandidates = uniqueLaneCandidates(scopedLanes).filter(candidate => !isNoOpPetCandidate(candidate));
  const relevantCandidates = orderDetailedCandidates(relevantLanes).map(candidate => mergeCandidateEvidence(candidate, relevantLanes));
  const meaningful = (domain: TaggedCandidateLane["domain"]) => uniqueCandidates(lanes.filter(lane => lane.domain === domain)
    .flatMap(lane => lane.candidates).filter(candidate => !isNoOpPetCandidate(candidate)));
  const armorCandidates = meaningful("ARMOR"), weaponCandidates = meaningful("WEAPONS");
  const accessoryCandidates = meaningful("ACCESSORIES"), petCandidates = meaningful("PETS");
  const availableAnalysis: AvailableAnalysis = {
    armor: { available: armorCandidates.length > 0, candidateCount: armorCandidates.length },
    weapons: { available: weaponCandidates.length > 0, candidateCount: weaponCandidates.length },
    accessories: { available: accessoryCandidates.length > 0, candidateCount: accessoryCandidates.length,
      currentMagicalPower: profile.accessories.magicalPower.total, missingCount: profile.accessories.missing.length, upgradeCount: profile.accessories.upgrades.length },
    pets: { available: petCandidates.length > 0, candidateCount: petCandidates.length, ownedCount: profile.pets.owned.length },
  };
  const conversationState = input.conversationState || input.budgetCoins !== undefined
    ? { ...input.conversationState, budgetCoins: input.conversationState?.budgetCoins ?? input.budgetCoins }
    : undefined;
  const effectiveBudgetCoins = input.budgetCoins ?? input.conversationState?.budgetCoins;
  const frontier = selectProgressionFrontier({ route, candidates: relevantCandidates.map((candidate, stableOrder) => ({ candidate, stableOrder,
    relevance: buildCandidateRelevance(relevantLanes, candidate.id, route),
    feasibility: buildCandidateFeasibility(candidate, profile, effectiveBudgetCoins),
    sourceLanes: relevantLanes.filter(lane => lane.candidates.some(value => value.id === candidate.id)).map(lane => lane.label),
  })) });
  const detailedCandidates = frontier.selected.map(candidate => candidate.candidate);
  const relevanceById = new Map(frontier.selected.map(candidate => [candidate.candidate.id, candidate.relevance]));
  const context = buildAdvisorContext({ question: input.question, profile, route, availableAnalysis, candidates: detailedCandidates, conversationState,
    relevanceById, budgetCoins: effectiveBudgetCoins });
  const candidateLanes = Object.fromEntries(detailedCandidates.map(candidate => [candidate.id,
    relevantLanes.filter(lane => lane.candidates.some(value => value.id === candidate.id)).map(lane => lane.label)]));
  const rabbitPets = profile.pets.owned.filter(pet => pet.type.toUpperCase() === "RABBIT");
  const rabbitNoOpInRawLanes = lanes.some(lane => lane.domain === "PETS" && lane.candidates.some(candidate =>
    candidate.id.toUpperCase().startsWith("RABBIT;") && isNoOpPetCandidate(candidate)));
  const petUniqueTypeCount = new Set(profile.pets.owned.map(pet => pet.type)).size;
  const level100RabbitDetected = rabbitPets.some(pet => pet.level !== null && pet.maxLevel !== null && pet.level >= pet.maxLevel);
  const lowerRabbitDetected = rabbitPets.some(pet => pet.level !== null && pet.maxLevel !== null && pet.level < pet.maxLevel);
  const rabbitLevelTargetExists = pets.lanes.levelTarget.some(candidate => candidate.id.toUpperCase().startsWith("RABBIT;"));
  const relevantIds = new Set(relevantCandidates.map(candidate => candidate.id));
  const removedByRelevance = rawScopedCandidates.filter(candidate => !relevantIds.has(candidate.id)).map(candidate => ({
    id: candidate.id, domain: candidate.domain, name: candidate.item.name,
    sourceLanes: scopedLanes.filter(lane => lane.candidates.some(value => value.id === candidate.id)).map(lane => lane.label),
    reason: "Only appeared in lanes irrelevant to the active goal.",
  }));
  const buckets: SelectionBucket[] = ["ACTIONABLE", "MONEY_GATED", "PROGRESSION_GATED", "DISTANT_OR_UNCERTAIN"];
  const exclusions: ExclusionReason[] = ["REDUNDANCY_LIMIT", "BUCKET_LIMIT", "FINAL_CAP", "LOWER_CONTEXT_PRIORITY", "NO_OP", "OTHER"];
  return {
    context, route, availableAnalysis, detailedCandidates, candidateLanes, frontierCandidates: frontier.candidates,
    rawScopeCandidates: rawScopedCandidates.map(candidate => ({ candidateId: candidate.id, domain: candidate.domain, name: candidate.item.name,
      sourceLanes: scopedLanes.filter(lane => lane.candidates.some(value => value.id === candidate.id)).map(lane => lane.label) })),
    diagnostics: {
      profileWarningCount: profile.warnings.length,
      compactWarningCount: compactProfileWarnings(profile.warnings).length,
      petOwnedCount: profile.pets.owned.length,
      petUniqueTypeCount,
      petDuplicateCount: profile.pets.owned.length - petUniqueTypeCount,
      level100RabbitDetected,
      rabbitLowerLevelTargetSuppressed: level100RabbitDetected && lowerRabbitDetected && !rabbitLevelTargetExists,
      rabbitNoOpSuppressed: rabbitNoOpInRawLanes && !detailedCandidates.some(candidate => candidate.id.toUpperCase().startsWith("RABBIT;") && isNoOpPetCandidate(candidate)),
      rawActiveScopeCandidateCount: rawScopedCandidates.length,
      goalRelevantCandidateCount: relevantCandidates.length,
      removedByRelevance,
      selectedBucketCounts: Object.fromEntries(buckets.map(bucket => [bucket, frontier.selected.filter(candidate => candidate.selection.bucket === bucket).length])) as Record<SelectionBucket, number>,
      exclusionCounts: Object.fromEntries(exclusions.map(reason => [reason, frontier.candidates.filter(candidate => candidate.selection.exclusionReason === reason).length])) as Record<ExclusionReason, number>,
      unselectedGoalRelevantCount: frontier.candidates.filter(candidate => !candidate.selection.selected).length,
    },
  };
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
  if (scope === "SURVIVABILITY") return new Set(["defense", "health"]);
  if (scope === "DAMAGE") return new Set(["damage", "strength", "critDamage", "attackSpeed", "ability"]);
  if (scope === "MAGE") return new Set(["intelligence", "ability"]);
  if (scope === "ARCHER" || scope === "BERSERK") return new Set(["damage", "strength", "critDamage", "attackSpeed", "ability"]);
  return null;
}

function uniqueCandidates(candidates: readonly AdvisorCandidate[]) {
  return [...new Map(candidates.map(candidate => [candidate.id, candidate])).values()];
}
