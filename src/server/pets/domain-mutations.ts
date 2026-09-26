import type { OwnedPetSetup } from "../../schemas/owned-pet-setup";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition } from "../../schemas/pet-mechanics";
import type { PetMutation } from "../../schemas/pet-mutations";
import type { PetProgressionDomain } from "../../schemas/pet-domain-relevance";
import { evaluatePetDomainRelevance } from "./domain-relevance";
import { buildPetMutations } from "./mutations";

export function buildDomainPetMutations(input: {
  domain: PetProgressionDomain;
  setups: readonly OwnedPetSetup[];
  definitions: readonly CanonicalPetDefinition[];
  petItems?: readonly CanonicalPetItemDefinition[];
}): PetMutation[] {
  const definitions = new Map(input.definitions.map(value => [value.id, value]));
  const petItems = new Map((input.petItems ?? []).map(value => [value.itemId, value]));

  const relevantPetIds = input.definitions
    .filter(definition => evaluatePetDomainRelevance(definition, input.domain).relevant)
    .map(definition => definition.id);

  const relevantPetItemIds = (input.petItems ?? [])
    .filter(item => input.definitions.some(definition => itemRelevantForDomain(definition, item, input.domain)))
    .map(item => item.itemId);

  const relevantSetups = input.setups.filter(setup => {
    if (!setup.canonicalPetId) return false;
    const definition = definitions.get(setup.canonicalPetId);
    if (!definition) return false;
    const item = setup.heldItem ? petItems.get(setup.heldItem) : undefined;
    return evaluatePetDomainRelevance(definition, input.domain, item).relevant;
  });

  const mutations = buildPetMutations({
    setups: relevantSetups,
    definitions: input.definitions,
    petItems: input.petItems,
    candidatePetIds: relevantPetIds,
    candidatePetItemIds: relevantPetItemIds,
  });

  return mutations.filter(mutation => mutationRelevantAfter(mutation, definitions, petItems, input.domain));
}

function itemRelevantForDomain(
  definition: CanonicalPetDefinition,
  item: CanonicalPetItemDefinition,
  domain: PetProgressionDomain,
) {
  return evaluatePetDomainRelevance(definition, domain, item).evidence.some(value => value.source === "PET_ITEM_EFFECT");
}

function mutationRelevantAfter(
  mutation: PetMutation,
  definitions: Map<string, CanonicalPetDefinition>,
  petItems: Map<string, CanonicalPetItemDefinition>,
  domain: PetProgressionDomain,
) {
  const definition = definitions.get(mutation.after.canonicalPetId);
  if (!definition) return false;
  const item = mutation.after.heldItem ? petItems.get(mutation.after.heldItem) : undefined;
  return evaluatePetDomainRelevance(definition, domain, item).relevant;
}
