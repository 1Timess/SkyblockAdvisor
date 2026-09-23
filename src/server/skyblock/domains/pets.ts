import type { RawMember } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";
import type { NormalizedPet } from "../../../schemas/pets";
import { effectivePetRarity, getPetLevel } from "../../reference/pet-leveling";

export function buildPets(member: RawMember, warnings: ProfileWarning[]) {
  const rawPets = member.pets_data?.pets;
  if (!rawPets) warnings.push({ code: "PARTIAL_PROFILE", scope: "pets", message: "Owned pets were not supplied." });
  const owned: NormalizedPet[] = (rawPets ?? []).map(pet => {
    const rarity = pet.tier?.toLowerCase() ?? "unknown", type = pet.type ?? "UNKNOWN";
    const xp = pet.exp ?? 0;
    // Tier Boost changes the display/reference rarity; XP uses the pet's raw rarity (§8.5).
    const level = pet.exp === undefined ? null : getPetLevel(xp, rarity, type);
    if (!level) warnings.push({ code: "REFERENCE_DATA_MISSING", scope: "pets", message: `Pet level unavailable for ${type}: missing XP or unsupported rarity.` });
    return {
      uuid: pet.uuid ?? pet.uniqueId ?? null, type, name: type.toLowerCase().split("_").map(word => word[0].toUpperCase() + word.slice(1)).join(" "),
      rarity, effectiveRarity: effectivePetRarity(rarity, pet.heldItem),
      level: level?.level ?? null, maxLevel: level?.maxLevel ?? null, xp, xpCurrent: level?.xpCurrent ?? null,
      xpForNext: level?.xpForNext ?? null, progress: level?.progress ?? null, active: pet.active ?? false,
      heldItem: pet.heldItem ?? null, candyUsed: pet.candyUsed ?? 0, skin: pet.skin ?? null, stats: {}, abilityLore: [],
    };
  });
  return { owned, activePet: owned.find(pet => pet.active) ?? null };
}
