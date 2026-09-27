import type { CandidateItem } from "../../schemas/catalog";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { OwnedPetSetup } from "../../schemas/owned-pet-setup";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition } from "../../schemas/pet-mechanics";
import type { PetProgressionDomain } from "../../schemas/pet-domain-relevance";
import type { PetMutation } from "../../schemas/pet-mutations";
import { buildDomainPetMutations } from "../pets/domain-mutations";
import { buildPetMutationFamilies } from "../pets/mutation-families";
import { evaluatePetDomainRelevance } from "../pets/domain-relevance";

const rarityTiers = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export function buildActivityPetLanes(input: {
  domain: PetProgressionDomain;
  setups: readonly OwnedPetSetup[];
  definitions: readonly CanonicalPetDefinition[];
  petItems: readonly CanonicalPetItemDefinition[];
  catalog: readonly CandidateItem[];
}): Record<string, AdvisorCandidate[]> {
  const catalog = new Map(input.catalog.map(item => [item.id, item]));
  const definitions = new Map(input.definitions.map(value => [value.id, value]));
  const petItems = new Map(input.petItems.map(value => [value.itemId, value]));
  const domainMutations = buildDomainPetMutations(input);
  const mutations = domainMutations.filter(isNonAcquirePetMutation);
  const lanes: Record<string, AdvisorCandidate[]> = {};

  for (const mutation of mutations) {
    const item = catalog.get(mutation.after.canonicalPetId);
    if (!item) continue;
    const lane = laneFor(mutation.kind);
    const candidate: AdvisorCandidate = {
      id: mutation.mutationId,
      domain: "pet",
      item,
      knownChanges: knownChanges(mutation),
      requirements: mutation.requirements.itemCosts.map(cost => `${cost.count}x ${cost.itemId}`),
      abilityText: item.abilityText,
      setBonusText: [],
      semanticEvidence: semanticEvidence(mutation.after.canonicalPetId, mutation.after.heldItem),
      warnings: [
        ...mutation.reasons,
        ...mutation.uncertainty,
        ...(mutation.kind === "LEVEL_TARGET" ? ["Pet leveling cost is not priced by the activity integration layer."] : []),
        ...(mutation.kind === "KAT_UPGRADE" ? ["Kat upgrade market components are not yet composed into the shared advisor price field."] : []),
        ...(mutation.kind === "CHANGE_HELD_ITEM" ? ["Held-item market cost is not yet composed into the shared advisor price field."] : []),
      ],
    };
    (lanes[lane] ??= []).push(candidate);
  }

  for (const family of buildPetMutationFamilies(input.domain, domainMutations).filter(value => value.kind === "ACQUIRE_FAMILY")) {
    const first = family.children[0];
    const item = first ? catalog.get(first.after.canonicalPetId) : undefined;
    if (!item) continue;
    const candidate: AdvisorCandidate = {
      id: family.familyId,
      domain: "pet",
      item,
      requirements: [],
      abilityText: item.abilityText,
      setBonusText: [],
      semanticEvidence: [...new Set(family.children.flatMap(child => semanticEvidence(child.after.canonicalPetId, child.after.heldItem)))],
      warnings: ["Pet acquisition pricing is level-aware and remains unresolved until concrete market choices are composed downstream."],
      petAcquisitionFamily: {
        kind: "PET_ACQUISITION",
        familyId: family.familyId,
        petType: family.petType,
        members: family.children.map(child => ({
          id: child.mutationId,
          canonicalPetId: child.after.canonicalPetId,
          rarity: child.after.baseRarity,
          level: child.after.level,
          maxLevel: child.after.maxLevel,
        })),
      },
    };
    (lanes.petAcquisition ??= []).push(candidate);
  }

  for (const candidates of Object.values(lanes)) candidates.sort((a, b) => a.id.localeCompare(b.id));
  return lanes;

  function semanticEvidence(canonicalPetId: string, heldItemId: string | null) {
    const definition = definitions.get(canonicalPetId);
    if (!definition) return [];
    const heldItem = heldItemId ? petItems.get(heldItemId) ?? null : null;
    return [...new Set(evaluatePetDomainRelevance(definition, input.domain, heldItem).evidence
      .filter(value => value.source === "PET_EFFECT" || value.source === "PET_ITEM_EFFECT")
      .map(value => value.mechanic))].sort();
  }
}

type NonAcquirePetMutation = Exclude<PetMutation, { kind: "ACQUIRE" }>;

function isNonAcquirePetMutation(mutation: PetMutation): mutation is NonAcquirePetMutation {
  return mutation.kind !== "ACQUIRE";
}

function laneFor(kind: NonAcquirePetMutation["kind"]) {
  if (kind === "KAT_UPGRADE") return "petRarityUpgrade";
  if (kind === "CHANGE_HELD_ITEM") return "petHeldItem";
  return "petLevelTarget";
}

function knownChanges(mutation: NonAcquirePetMutation): NonNullable<AdvisorCandidate["knownChanges"]> {
  const changes: NonNullable<AdvisorCandidate["knownChanges"]> = {};
  if (mutation.before?.level !== mutation.after.level) changes.petLevel = { current: mutation.before?.level ?? null, candidate: mutation.after.level };
  if (mutation.before?.baseRarity !== mutation.after.baseRarity) {
    changes.petRarityTier = { current: mutation.before ? rarityIndex(mutation.before.baseRarity) : null, candidate: rarityIndex(mutation.after.baseRarity) };
  }
  if (mutation.before?.heldItem !== mutation.after.heldItem) changes.petHeldItem = { current: mutation.before?.heldItem ? 1 : 0, candidate: mutation.after.heldItem ? 1 : 0 };
  return changes;
}

function rarityIndex(rarity: string) {
  const index = rarityTiers.indexOf(rarity.toLowerCase() as typeof rarityTiers[number]);
  return index < 0 ? null : index;
}
