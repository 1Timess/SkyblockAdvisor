import type { PetMutation } from "../../schemas/pet-mutations";
import { petMutationFamilySchema, type PetMutationFamily } from "../../schemas/pet-mutation-families";
import type { PetProgressionDomain } from "../../schemas/pet-domain-relevance";

export function buildPetMutationFamilies(domain: PetProgressionDomain, mutations: readonly PetMutation[]): PetMutationFamily[] {
  const families: PetMutationFamily[] = [];
  const acquisitions = new Map<string, PetMutation[]>();

  for (const mutation of mutations) {
    if (mutation.kind === "ACQUIRE") {
      const children = acquisitions.get(mutation.after.type) ?? [];
      children.push(mutation);
      acquisitions.set(mutation.after.type, children);
      continue;
    }
    families.push(petMutationFamilySchema.parse({
      familyId: `pet-family:${domain}:${mutation.mutationId}`,
      domain, kind: "CONCRETE_MUTATION", petType: mutation.after.type,
      sourceSetupId: mutation.sourceSetupId, children: [mutation],
    }));
  }

  for (const [petType, children] of acquisitions) {
    families.push(petMutationFamilySchema.parse({
      familyId: `pet-family:${domain}:acquire:${petType}`,
      domain, kind: "ACQUIRE_FAMILY", petType, sourceSetupId: null,
      children: [...children].sort((a, b) => rarityIndex(a.after.baseRarity) - rarityIndex(b.after.baseRarity)),
    }));
  }
  return families.sort((a, b) =>
    familyOrder(a.kind) - familyOrder(b.kind) ||
    a.petType.localeCompare(b.petType) ||
    a.familyId.localeCompare(b.familyId)
  );
}

function rarityIndex(rarity: string) {
  return ["common", "uncommon", "rare", "epic", "legendary", "mythic"].indexOf(rarity.toLowerCase());
}

function familyOrder(kind: PetMutationFamily["kind"]) {
  return kind === "CONCRETE_MUTATION" ? 0 : 1;
}
