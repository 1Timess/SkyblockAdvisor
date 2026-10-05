import type { ProfileItem } from "../../schemas/items";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { NormalizedPet } from "../../schemas/pets";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition } from "../../schemas/pet-mechanics";
import type { OwnedPetSetup } from "../../schemas/owned-pet-setup";
import type { PetProgressionDomain } from "../../schemas/pet-domain-relevance";
import { buildMiningKnowledge } from "../reference/mining-knowledge";
import { indexForagingGear } from "../foraging/gear-state";
import { buildForagingProgressionFocus } from "../foraging/progression-focus";
import { buildObservedFarmingState } from "../farming/observed-state";
import { farmingSkillFocus } from "../farming/progression-focus";
import { evaluatePetDomainRelevance } from "../pets/domain-relevance";

export type SkillSummarySupport = "DOMAIN_NATIVE" | "COMPOSED" | "OBSERVED_ONLY";
export type SkillProgressionFocus = {
  kind: string;
  label: string;
  current: number | null;
  target: number | null;
  remaining: number | null;
  basis: string;
};

export interface SkillCandidateEvidence {
  lane: string;
  candidate: AdvisorCandidate;
}

export interface SkillDomainEvidence {
  farming?: {
    gardenAvailable: boolean;
    gardenLevel: number | null;
    gardenXp: number | null;
    nextGardenLevel: { level: number; xpRequired: number; xpRemaining: number } | null;
    nextCropMilestones: Array<{ crop: string; resourceId: string; collected: number; tier: number; threshold: number; remaining: number }>;
    equipmentComparisons: unknown[];
  };
}

export interface SkillProgressionSummary {
  skill: string;
  level: number;
  maxLevel: number;
  xp: number;
  progress: number;
  support: SkillSummarySupport;
  facts: Array<{ label: string; value: string | number | null }>;
  relevantItems: ProfileItem[];
  primaryItem: ProfileItem | null;
  relevantOwnedPets: NormalizedPet[];
  progressionFocus: SkillProgressionFocus | null;
  candidateEvidence: SkillCandidateEvidence[];
  domainEvidence: SkillDomainEvidence;
  displayItem: ProfileItem | null;
  displayPet: NormalizedPet | null;
  limitations: string[];
}

/**
 * Presentation adapter for the Skills UI.
 *
 * This module intentionally owns no SkyBlock progression rules. It composes
 * normalized observations and existing domain-native interpreters into a
 * stable, small contract. Candidate ranking and advisor prioritization remain
 * in their existing domain/advisor pipelines.
 */
export interface SkillProgressionPetKnowledge {
  setups: readonly OwnedPetSetup[];
  definitions: readonly CanonicalPetDefinition[];
  petItems: readonly CanonicalPetItemDefinition[];
}

export function buildSkillProgressionSummaries(
  profile: NormalizedSkyBlockProfile,
  petKnowledge?: SkillProgressionPetKnowledge,
): Record<string, SkillProgressionSummary> {
  return Object.fromEntries(Object.entries(profile.progression.skills).map(([skill, level]) => {
    const base: SkillProgressionSummary = {
      skill,
      level: level.level,
      maxLevel: level.maxLevel,
      xp: level.xp,
      progress: level.progress,
      support: "OBSERVED_ONLY",
      facts: [],
      relevantItems: [],
      primaryItem: null,
      relevantOwnedPets: [],
      progressionFocus: nextSkillLevelFocus(skill, level.level, level.maxLevel),
      candidateEvidence: [],
      domainEvidence: {},
      displayItem: null,
      displayPet: null,
      limitations: ["No dedicated deterministic progression domain is composed for this skill yet."],
    };
    if (skill === "mining") return [skill, finalizePresentation(withDomainEvidence(withEvidence(withDomainPets(profile, miningSummary(profile, base), "MINING", petKnowledge), candidateEvidence.mining), domainEvidence.mining))];
    if (skill === "fishing") return [skill, finalizePresentation(withDomainEvidence(withEvidence(withDomainPets(profile, fishingSummary(profile, base), "FISHING", petKnowledge), candidateEvidence.fishing), domainEvidence.fishing))];
    if (skill === "foraging") return [skill, finalizePresentation(withDomainEvidence(withEvidence(withDomainPets(profile, foragingSummary(profile, base), "FORAGING", petKnowledge), candidateEvidence.foraging), domainEvidence.foraging))];
    if (skill === "farming") return [skill, finalizePresentation(withDomainEvidence(withEvidence(withDomainPets(profile, farmingSummary(profile, base), "FARMING", petKnowledge), candidateEvidence.farming), domainEvidence.farming))];
    if (skill === "combat") return [skill, finalizePresentation(withDomainEvidence(withEvidence(withDomainPets(profile, combatSummary(profile, base), "COMBAT", petKnowledge), candidateEvidence.combat), domainEvidence.combat))];
    return [skill, finalizePresentation(withDomainEvidence(base, domainEvidence[skill]))];
  }));
}

function miningSummary(profile: NormalizedSkyBlockProfile, base: SkillProgressionSummary): SkillProgressionSummary {
  const mining = profile.progression.mining;
  const knowledge = buildMiningKnowledge(profile);
  const tools = uniqueItems(profile.inventoryItems.filter(item => item.categories.includes("drill") || item.categories.includes("pickaxe")));
  const hotmFocus = mining.hotmLevel === null ? null : {
    kind: "HOTM_TIER", label: `Reach Heart of the Mountain ${Math.min(10, mining.hotmLevel + 1)}`,
    current: mining.hotmLevel, target: Math.min(10, mining.hotmLevel + 1), remaining: mining.hotmLevel >= 10 ? 0 : 1,
    basis: "Observed Heart of the Mountain tier.",
  };
  return { ...base, support: "DOMAIN_NATIVE",
    facts: [{ label: "Heart of the Mountain", value: mining.hotmLevel }, { label: "Mining Stage", value: knowledge.stage }],
    relevantItems: tools, primaryItem: tools.length === 1 ? tools[0] : null,
    progressionFocus: mining.hotmLevel !== null && mining.hotmLevel < 10 ? hotmFocus : base.progressionFocus,
    limitations: tools.length > 1 ? ["Multiple relevant Mining tools are visible; no single best tool is asserted because Mining gear is multi-dimensional."] : [] };
}

function fishingSummary(profile: NormalizedSkyBlockProfile, base: SkillProgressionSummary): SkillProgressionSummary {
  const fishing = profile.progression.fishing;
  const tools = uniqueItems(profile.inventoryItems.filter(item => item.categories.includes("fishing_rod")));
  return { ...base, support: "DOMAIN_NATIVE",
    facts: [{ label: "Sea Creature Kills", value: fishing.seaCreatureKills }],
    relevantItems: tools, primaryItem: tools.length === 1 ? tools[0] : null,
    limitations: tools.length > 1 ? ["Multiple Fishing rods are visible; the domain does not currently establish one universal best owned rod."] : [] };
}

function foragingSummary(profile: NormalizedSkyBlockProfile, base: SkillProgressionSummary): SkillProgressionSummary {
  const state = profile.progression.foraging;
  const gear = indexForagingGear(profile);
  const progression = buildForagingProgressionFocus(profile);
  const tools = profile.inventoryItems.filter(item => gear.visible.some(observed => observed.id === item.id && observed.source === item.source)
    && (item.categories.includes("foraging_tool") || item.categories.includes("axe")));
  const hotf = progression.targets.find(target => target.kind === "HOTF_TIER");
  const focus = hotf && hotf.kind === "HOTF_TIER" ? {
    kind: hotf.kind, label: `Reach Heart of the Forest ${hotf.targetTier}`, current: hotf.currentTier, target: hotf.targetTier,
    remaining: hotf.xpRemaining, basis: "Verified HOTF XP threshold and observed tree experience.",
  } : base.progressionFocus;
  return { ...base, support: "DOMAIN_NATIVE",
    facts: [{ label: "Heart of the Forest", value: state.hotfLevel }, { label: "Tree Experience", value: state.treeExperience }],
    relevantItems: uniqueItems(tools), primaryItem: tools.length === 1 ? tools[0] : null,
    progressionFocus: focus,
    limitations: ["Effective account-level Sweep and Foraging Fortune are intentionally not reconstructed."] };
}

function farmingSummary(profile: NormalizedSkyBlockProfile, base: SkillProgressionSummary): SkillProgressionSummary {
  const observed = buildObservedFarmingState(profile);
  const focus = farmingSkillFocus(profile);
  const visible = new Set(observed.visibleEquipment.flatMap(item => item.id ? [item.id] : []));
  const items = uniqueItems(profile.inventoryItems.filter(item => item.id && visible.has(item.id)));
  return { ...base, support: "DOMAIN_NATIVE",
    facts: [],
    relevantItems: items, primaryItem: items.length === 1 ? items[0] : null,
    progressionFocus: focus && typeof focus === "object" && "targetLevel" in focus ? {
      kind: "FARMING_LEVEL", label: `Reach Farming ${String(focus.targetLevel)}`, current: base.level,
      target: typeof focus.targetLevel === "number" ? focus.targetLevel : null, remaining: null,
      basis: "Existing Farming skill progression focus.",
    } : base.progressionFocus,
    limitations: ["Garden state requires the richer live Farming composition before it can be represented here."] };
}

function combatSummary(profile: NormalizedSkyBlockProfile, base: SkillProgressionSummary): SkillProgressionSummary {
  const weapons = uniqueItems(profile.gear.weapons);
  return { ...base, support: "COMPOSED",
    facts: [{ label: "Catacombs", value: profile.progression.dungeons.catacombs?.level ?? null }],
    relevantItems: weapons, primaryItem: profile.gear.equippedWeapon,
    progressionFocus: base.progressionFocus,
    limitations: ["Combat does not yet have a standalone progression domain; this summary composes Combat skill state with observed equipped gear and Dungeons context."] };
}

function withDomainEvidence(summary: SkillProgressionSummary, evidence?: SkillDomainEvidence): SkillProgressionSummary {
  return evidence ? { ...summary, domainEvidence: evidence } : summary;
}

function finalizePresentation(summary: SkillProgressionSummary): SkillProgressionSummary {
  const displayItem = summary.primaryItem ?? (summary.relevantItems.length === 1 ? summary.relevantItems[0] : null);
  const displayPet = summary.relevantOwnedPets.length === 1 ? summary.relevantOwnedPets[0] : null;
  return { ...summary, displayItem, displayPet };
}

function withEvidence(summary: SkillProgressionSummary, evidence?: readonly SkillCandidateEvidence[]): SkillProgressionSummary {
  return evidence?.length ? { ...summary, candidateEvidence: [...evidence] } : summary;
}

function withDomainPets(
  profile: NormalizedSkyBlockProfile,
  summary: SkillProgressionSummary,
  domain: PetProgressionDomain,
  knowledge?: SkillProgressionPetKnowledge,
): SkillProgressionSummary {
  if (!knowledge) return { ...summary, limitations: [...summary.limitations, "Canonical pet knowledge was not supplied to the Skills summary."] };
  const definitions = new Map(knowledge.definitions.map(definition => [definition.id, definition]));
  const petItems = new Map(knowledge.petItems.map(item => [item.itemId, item]));
  const relevantOwnedPets = profile.pets.owned.filter((_, index) => {
    const setup = knowledge.setups[index];
    if (!setup?.canonicalPetId) return false;
    const definition = definitions.get(setup.canonicalPetId);
    if (!definition) return false;
    const heldItem = setup.canonicalPetItemId ? petItems.get(setup.canonicalPetItemId) ?? null : null;
    return evaluatePetDomainRelevance(definition, domain, heldItem).relevant;
  });
  return { ...summary, relevantOwnedPets };
}

function nextSkillLevelFocus(skill: string, level: number, maxLevel: number): SkillProgressionFocus | null {
  if (level >= maxLevel) return null;
  return { kind: "SKILL_LEVEL", label: `Reach ${titleCase(skill)} ${level + 1}`, current: level, target: level + 1,
    remaining: null, basis: "Normalized skill level." };
}

function uniqueItems(items: readonly ProfileItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.uuid ?? `${item.source}:${item.id ?? item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, character => character.toUpperCase());
}
