import type { AdvisorGoal, AdvisorRole, AdvisorRoute } from "../../schemas/advisor";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { TaggedCandidateLane } from "./context";

export interface CandidateRelevance {
  reason: string;
  relevantStats: string[];
}

export function filterCandidateLanesForGoal(lanes: readonly TaggedCandidateLane[], route: AdvisorRoute): TaggedCandidateLane[] {
  if (route.goal === "MAGICAL_POWER" || route.goal === "PET") return [...lanes];
  const allowed = relevantLaneNames(route.goal, route.inferredRole);
  return lanes.flatMap(lane => {
    const laneName = laneNameOf(lane.label);
    if (!allowed.has(laneName)) return [];
    const candidates = lane.candidates.filter(candidate => roleCategoryMatches(candidate, route));
    return candidates.length ? [{ ...lane, candidates }] : [];
  });
}

export function buildCandidateRelevance(lanes: readonly TaggedCandidateLane[], candidateId: string, route: AdvisorRoute): CandidateRelevance {
  const laneNames = [...new Set(lanes.filter(lane => lane.candidates.some(candidate => candidate.id === candidateId)).map(lane => laneNameOf(lane.label)))];
  const stats = laneNames.filter(lane => lane !== "ability" && !accessoryOrPetLane(lane));
  if (route.goal === "MAGICAL_POWER") return { reason: "Accessory progression is directly relevant to the Magical Power goal.", relevantStats: ["magicalPower"] };
  if (route.goal === "PET") return { reason: "Pet progression is directly relevant to the requested pet scope.", relevantStats: laneNames };
  if (laneNames.includes("ability")) return { reason: `Ability evidence is relevant to the ${goalLabel(route.goal)} goal${stats.length ? ` alongside ${stats.join(", ")}` : ""}.`, relevantStats: stats };
  return { reason: `Improves goal-relevant ${stats.length === 1 ? "stat" : "stats"}: ${stats.join(", ")}.`, relevantStats: stats };
}

export function mergeCandidateEvidence(candidate: AdvisorCandidate, lanes: readonly TaggedCandidateLane[]): AdvisorCandidate {
  const occurrences = lanes.flatMap(lane => lane.candidates.filter(value => value.id === candidate.id));
  return { ...candidate,
    knownChanges: mergeKnownChanges(occurrences),
    warnings: [...new Set(occurrences.flatMap(value => value.warnings))],
  };
}

function mergeKnownChanges(candidates: readonly AdvisorCandidate[]) {
  const changes: NonNullable<AdvisorCandidate["knownChanges"]> = {};
  for (const candidate of candidates) for (const [stat, change] of Object.entries(candidate.knownChanges ?? {})) {
    const previous = changes[stat];
    const currents = [previous?.current, change.current].filter((value): value is number => value !== null && value !== undefined);
    changes[stat] = { current: currents.length ? Math.max(...currents) : null, candidate: change.candidate ?? previous?.candidate ?? null };
  }
  return changes;
}

export function uniqueLaneCandidates(lanes: readonly TaggedCandidateLane[]) {
  return [...new Map(lanes.flatMap(lane => lane.candidates).map(candidate => [candidate.id, candidate])).values()];
}

function relevantLaneNames(goal: AdvisorGoal, role: AdvisorRole | null): ReadonlySet<string> {
  const direct: Partial<Record<AdvisorGoal, string[]>> = {
    DAMAGE: ["damage", "strength", "critDamage", "attackSpeed", "ability"],
    SURVIVABILITY: ["health", "defense"], HEALTH: ["health"], DEFENSE: ["defense"], STRENGTH: ["strength"],
    CRIT_DAMAGE: ["critDamage"], ATTACK_SPEED: ["attackSpeed"], INTELLIGENCE: ["intelligence"], SPEED: ["speed"],
  };
  if (direct[goal]) return new Set(direct[goal]);
  if (role === "berserk") return new Set(["damage", "strength", "critDamage", "attackSpeed", "ability"]);
  if (role === "archer") return new Set(["damage", "strength", "critDamage", "attackSpeed", "ability"]);
  if (role === "mage") return new Set(["intelligence", "ability", "damage"]);
  if (role === "tank" || role === "healer") return new Set(["health", "defense"]);
  return new Set(["damage", "strength", "critDamage", "attackSpeed", "ability", "health", "defense"]);
}

function roleCategoryMatches(candidate: AdvisorCandidate, route: AdvisorRoute) {
  if (!["GENERAL_UPGRADE", "ARMOR", "WEAPON"].includes(route.goal) || candidate.domain !== "weapon") return true;
  if (route.inferredRole === "archer") return candidate.item.categories.includes("bow");
  if (route.inferredRole === "berserk") return candidate.item.categories.includes("sword");
  return true;
}

function laneNameOf(label: string) { return label.slice(label.lastIndexOf(":") + 1); }
function accessoryOrPetLane(lane: string) { return ["missing", "rarityUpgrade", "cheapestMp", "recombobulation", "enrichment", "owned", "levelTarget", "roleProgression"].includes(lane); }
function goalLabel(goal: AdvisorGoal) { return goal.toLowerCase().replaceAll("_", " "); }
