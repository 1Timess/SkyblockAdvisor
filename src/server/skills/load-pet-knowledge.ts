import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { neuItemSchema, type NeuItem } from "../../schemas/neu";
import { loadNeuPetConstants } from "../reference/neu/pets";
import { neuItemsDirectory } from "../reference/neu/paths";
import { buildCanonicalPetDefinitions, buildCanonicalPetItemDefinitions } from "../reference/pet-mechanics";
import { buildOwnedPetSetups } from "../pets/owned-setups";
import type { SkillProgressionPetKnowledge } from "./progression-summary";

const rarityTiers = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export async function loadSkillPetKnowledge(profile: NormalizedSkyBlockProfile): Promise<SkillProgressionPetKnowledge> {
  const constants = await loadNeuPetConstants();
  const ids = new Set<string>();
  for (const pet of profile.pets.owned) {
    const tier = rarityTiers.indexOf(pet.rarity.toLowerCase() as typeof rarityTiers[number]);
    if (tier >= 0) ids.add(`${pet.type};${tier}`);
    if (pet.heldItem) ids.add(pet.heldItem);
  }
  const items = (await Promise.all([...ids].map(readNeuItem))).filter((item): item is NeuItem => item !== null);
  const definitions = buildCanonicalPetDefinitions(items, constants);
  const petItems = buildCanonicalPetItemDefinitions(items, constants);
  const setups = buildOwnedPetSetups({ pets: profile.pets.owned, definitions, petItems });
  return { setups, definitions, petItems };
}

async function readNeuItem(id: string): Promise<NeuItem | null> {
  try {
    const raw = await fs.readFile(path.join(neuItemsDirectory(), `${id}.json`), "utf8");
    return neuItemSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
