import type { AdvisorCandidate } from "../../schemas/candidates";
import { advisorContextSchema, type AdvisorContext, type AdvisorConversationState, type AdvisorRoute, type AnalysisDomain, type AvailableAnalysis } from "../../schemas/advisor";
import type { ProfileItem, ProfileWarning } from "../../schemas/items";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

export interface TaggedCandidateLane { domain: AnalysisDomain; label: string; candidates: readonly AdvisorCandidate[] }

export function buildAdvisorContext(input: {
  question: string;
  profile: NormalizedSkyBlockProfile;
  route: AdvisorRoute;
  availableAnalysis: AvailableAnalysis;
  candidates: readonly AdvisorCandidate[];
  conversationState?: AdvisorConversationState;
}): AdvisorContext {
  const compactItem = (item: ProfileItem) => ({ id: item.id, name: item.name, rarity: item.rarity, categories: item.categories,
    stats: item.stats, abilityText: item.abilityText, setBonusText: item.setBonusText });
  return advisorContextSchema.parse({
    question: input.question, route: input.route, conversationState: input.conversationState ?? null, availableAnalysis: input.availableAnalysis,
    player: {
      economy: input.profile.economy,
      skills: Object.fromEntries(Object.entries(input.profile.progression.skills).map(([id, value]) => [id, { level: value.level, maxLevel: value.maxLevel }])),
      slayers: Object.fromEntries(Object.entries(input.profile.progression.slayers).map(([id, value]) => [id, { level: value.level, xp: value.xp }])),
      dungeons: { catacombsLevel: input.profile.progression.dungeons.catacombs?.level ?? null,
        selectedClass: input.profile.progression.dungeons.selectedClass, highestFloorNormal: input.profile.progression.dungeons.highestFloorNormal,
        highestFloorMaster: input.profile.progression.dungeons.highestFloorMaster },
    },
    currentGear: { armor: input.profile.gear.armor.items.map(compactItem), equipment: input.profile.gear.equipment.items.map(compactItem),
      likelyWeapons: input.profile.gear.weapons.map(compactItem), activePet: input.profile.pets.activePet && {
        type: input.profile.pets.activePet.type, name: input.profile.pets.activePet.name, rarity: input.profile.pets.activePet.rarity,
        level: input.profile.pets.activePet.level, heldItem: input.profile.pets.activePet.heldItem,
        stats: input.profile.pets.activePet.stats, abilityLore: input.profile.pets.activePet.abilityLore,
      }, magicalPower: input.profile.accessories.magicalPower.total },
    candidates: input.candidates.map(candidate => ({ id: candidate.id, domain: candidate.domain, name: candidate.item.name,
      rarity: candidate.item.rarity, categories: candidate.item.categories, stats: candidate.item.stats, price: candidate.price ?? null,
      knownChanges: candidate.knownChanges ?? {}, requirements: candidate.requirements, abilityText: candidate.abilityText,
      setBonusText: candidate.setBonusText, warnings: candidate.warnings })),
    warnings: compactProfileWarnings(input.profile.warnings),
  });
}

export function selectDetailedCandidates(lanes: readonly TaggedCandidateLane[], cap = 32): AdvisorCandidate[] {
  const queues = lanes.map(lane => lane.candidates.filter(candidate => !isNoOpPetCandidate(candidate))), result: AdvisorCandidate[] = [], seen = new Set<string>();
  let advanced = true;
  while (result.length < Math.min(cap, 32) && advanced) {
    advanced = false;
    for (const queue of queues) {
      const candidate = queue.shift();
      if (!candidate) continue;
      advanced = true;
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id); result.push(candidate);
      if (result.length === Math.min(cap, 32)) return result;
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
