import "server-only";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { loadNeuRepository } from "../reference/neu/repository";
import { loadNeuPetConstants } from "../reference/neu/pets";
import { buildCanonicalPetDefinitions, buildCanonicalPetItemDefinitions } from "../reference/pet-mechanics";
import { buildOwnedPetSetups } from "../pets/owned-setups";
import { buildSkillProgressionSummaries, type SkillProgressionSummary } from "./progression-summary";

export async function loadSkillProgressionSummaries(
  profile: NormalizedSkyBlockProfile,
): Promise<Record<string, SkillProgressionSummary>> {
  const [neu, petConstants] = await Promise.all([loadNeuRepository(), loadNeuPetConstants()]);
  const definitions = buildCanonicalPetDefinitions(neu.getAll(), petConstants);
  const petItems = buildCanonicalPetItemDefinitions(neu.getAll(), petConstants);
  const setups = buildOwnedPetSetups({ pets: profile.pets.owned, definitions, petItems });
  return buildSkillProgressionSummaries(profile, { setups, definitions, petItems });
}
