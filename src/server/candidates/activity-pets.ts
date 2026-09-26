import type { CandidateItem } from "../../schemas/catalog";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { OwnedPetSetup } from "../../schemas/owned-pet-setup";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition } from "../../schemas/pet-mechanics";
import type { PetProgressionDomain } from "../../schemas/pet-domain-relevance";
import { buildDomainPetMutations } from "../pets/domain-mutations";

const rarityTiers = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export function buildActivityPetLanes(input: {
  domain: PetProgressionDomain;
  setups: readonly OwnedPetSetup[];
  definitions: readonly CanonicalPetDefinition[];
  petItems: readonly CanonicalPetItemDefinition[];
  catalog: readonly CandidateItem[];
}): Record<string, AdvisorCandidate[]> {
  const catalog = new Map(input.catalog.map(item => [item.id, item]));
  const mutations = buildDomainPetMutations(input).filter(mutation => mutation.kind !== "ACQUIRE");
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

  for (const candidates of Object.values(lanes)) candidates.sort((a, b) => a.id.localeCompare(b.id));
  return lanes;
}

function laneFor(kind: "KAT_UPGRADE" | "CHANGE_HELD_ITEM" | "LEVEL_TARGET") {
  if (kind === "KAT_UPGRADE") return "petRarityUpgrade";
  if (kind === "CHANGE_HELD_ITEM") return "petHeldItem";
  return "petLevelTarget";
}

function knownChanges(mutation: ReturnType<typeof buildDomainPetMutations>[number]): NonNullable<AdvisorCandidate["knownChanges"]> {
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
