import type { AdvisorCandidate } from "../../schemas/candidates";
import { advisorContextSchema, type AdvisorContext } from "../../schemas/advisor";
import type { ProfileItem } from "../../schemas/items";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

export type CandidateLaneGroups = Record<"armor" | "weapon" | "accessory" | "pet", readonly (readonly AdvisorCandidate[])[]>;

export function buildAdvisorContext(input: {
  question: string;
  profile: NormalizedSkyBlockProfile;
  candidateLanes: CandidateLaneGroups;
  maxCandidates?: number;
}): AdvisorContext {
  const candidates = selectCompactCandidates(input.candidateLanes, Math.min(input.maxCandidates ?? 32, 32));
  const compactItem = (item: ProfileItem) => ({ id: item.id, name: item.name, rarity: item.rarity, categories: item.categories,
    stats: item.stats, abilityText: item.abilityText, setBonusText: item.setBonusText });
  return advisorContextSchema.parse({
    question: input.question,
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
    candidates: candidates.map(candidate => ({ id: candidate.id, domain: candidate.domain, name: candidate.item.name,
      rarity: candidate.item.rarity, categories: candidate.item.categories, stats: candidate.item.stats, price: candidate.price ?? null,
      knownChanges: candidate.knownChanges ?? {}, requirements: candidate.requirements, abilityText: candidate.abilityText,
      setBonusText: candidate.setBonusText, warnings: candidate.warnings })),
    warnings: input.profile.warnings.map(warning => warning.message),
  });
}

export function selectCompactCandidates(groups: CandidateLaneGroups, cap = 32): AdvisorCandidate[] {
  const domains = ["armor", "weapon", "accessory", "pet"] as const, result: AdvisorCandidate[] = [], seen = new Set<string>();
  const queues = domains.map(domain => groups[domain].map(lane => [...lane]));
  let advanced = true;
  while (result.length < cap && advanced) {
    advanced = false;
    for (const domain of queues) for (const lane of domain) {
      const candidate = lane.shift();
      if (!candidate) continue;
      advanced = true;
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id); result.push(candidate);
      if (result.length === cap) return result;
    }
  }
  return result;
}
