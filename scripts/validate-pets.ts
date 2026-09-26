import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { loadNeuRepository } from "../src/server/reference/neu/repository";
import { loadNeuPetConstants } from "../src/server/reference/neu/pets";
import { buildCanonicalPetDefinitions, buildCanonicalPetItemDefinitions } from "../src/server/reference/pet-mechanics";
import { buildOwnedPetSetups } from "../src/server/pets/owned-setups";

async function main() {
  const username = process.argv[2];
  const requestedProfile = process.argv[3];
  if (!username) throw new Error("Usage: npm run validate:pets -- <username> [profile]");
  const [profile, neu, constants] = await Promise.all([
    buildNormalizedProfile({ usernameOrUuid: username, requestedProfile }),
    loadNeuRepository(),
    loadNeuPetConstants(),
  ]);
  const definitions = buildCanonicalPetDefinitions(neu.getAll(), constants);
  const petItems = buildCanonicalPetItemDefinitions(neu.getAll(), constants);
  const setups = buildOwnedPetSetups({ pets: profile.pets.owned, definitions, petItems });
  const duplicateTypes = [...new Set(setups.map(value => value.type).filter((type, index, all) => all.indexOf(type) !== index))].sort();
  const missingPets = setups.filter(value => value.resolution.petDefinition === "MISSING");
  const missingItems = setups.filter(value => value.resolution.petItemDefinition === "MISSING");
  const active = setups.filter(value => value.active);
  const setupIds = new Set(setups.map(value => value.setupId));
  const result = {
    username: profile.identity.username, profile: profile.profile.cuteName,
    counts: { normalizedPets: profile.pets.owned.length, setups: setups.length, uniqueSetupIds: setupIds.size,
      duplicateTypes: duplicateTypes.length, missingPetDefinitions: missingPets.length, missingPetItems: missingItems.length, activePets: active.length },
    invariants: {
      noPetsDropped: setups.length === profile.pets.owned.length,
      setupIdsUnique: setupIds.size === setups.length,
      atMostOneActive: active.length <= 1,
      activeIdentityPreserved: (profile.pets.activePet === null && active.length === 0) ||
        (profile.pets.activePet !== null && active.length === 1 && active[0].uuid === profile.pets.activePet.uuid && active[0].type === profile.pets.activePet.type),
    },
    duplicateTypes,
    active: active.map(value => ({ setupId: value.setupId, type: value.type, baseRarity: value.baseRarity,
      effectiveRarity: value.effectiveRarity, level: value.level, heldItem: value.heldItem })),
    missingPets: missingPets.map(value => ({ setupId: value.setupId, type: value.type, baseRarity: value.baseRarity })),
    missingItems: missingItems.map(value => ({ setupId: value.setupId, type: value.type, heldItem: value.heldItem })),
    duplicates: duplicateTypes.map(type => ({ type, setups: setups.filter(value => value.type === type).map(value => ({
      setupId: value.setupId, baseRarity: value.baseRarity, effectiveRarity: value.effectiveRarity, level: value.level,
      heldItem: value.heldItem, active: value.active,
    })) })),
  };
  console.log(JSON.stringify(result, null, 2));
  if (Object.values(result.invariants).some(value => !value)) process.exitCode = 1;
}
main().catch(error => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exitCode = 1; });
