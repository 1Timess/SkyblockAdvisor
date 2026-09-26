import type { NormalizedPet } from "../../schemas/pets";
import { ownedPetSetupSchema, type OwnedPetSetup } from "../../schemas/owned-pet-setup";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition } from "../../schemas/pet-mechanics";

const rarityTiers = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export function buildOwnedPetSetups(input: {
  pets: readonly NormalizedPet[];
  definitions: readonly CanonicalPetDefinition[];
  petItems?: readonly CanonicalPetItemDefinition[];
}): OwnedPetSetup[] {
  const definitions = new Map(input.definitions.map(value => [value.id, value]));
  const petItems = new Map((input.petItems ?? []).map(value => [value.itemId, value]));
  return input.pets.map((pet, index) => {
    const canonicalPetId = canonicalId(pet.type, pet.rarity);
    const definition = canonicalPetId ? definitions.get(canonicalPetId) : undefined;
    const heldItemDefinition = pet.heldItem ? petItems.get(pet.heldItem) : undefined;
    const level = definition ? resolveCanonicalPetLevel(pet.xp, definition) : null;
    return ownedPetSetupSchema.parse({
      setupId: pet.uuid ? `pet:${pet.uuid}` : fallbackSetupId(pet, index),
      uuid: pet.uuid, type: pet.type, name: pet.name,
      baseRarity: pet.rarity, effectiveRarity: pet.effectiveRarity,
      xp: pet.xp, level: level?.level ?? pet.level, maxLevel: definition?.maxLevel ?? pet.maxLevel,
      xpCurrent: level?.xpCurrent ?? pet.xpCurrent, xpForNext: level?.xpForNext ?? pet.xpForNext, progress: level?.progress ?? pet.progress,
      heldItem: pet.heldItem, candyUsed: pet.candyUsed, skin: pet.skin, active: pet.active,
      canonicalPetId: definition?.id ?? null,
      canonicalPetItemId: heldItemDefinition?.itemId ?? null,
      resolution: {
        petDefinition: definition ? "RESOLVED" : "MISSING",
        petItemDefinition: !pet.heldItem ? "NONE" : heldItemDefinition ? "RESOLVED" : "MISSING",
      },
    });
  });
}

function canonicalId(type: string, rarity: string) {
  const tier = rarityTiers.indexOf(rarity.toLowerCase() as typeof rarityTiers[number]);
  return tier < 0 ? null : `${type};${tier}`;
}

function fallbackSetupId(pet: NormalizedPet, index: number) {
  // Hypixel historically omitted UUIDs on some pet records. The source-order suffix keeps duplicate concrete copies distinct.
  return `pet:${pet.type}:${pet.rarity}:${index}`;
}

function resolveCanonicalPetLevel(xp: number, definition: CanonicalPetDefinition) {
  let level = 1, consumed = 0;
  for (const cost of definition.xpCurve) {
    if (level >= definition.maxLevel || consumed + cost > xp) break;
    consumed += cost;
    level++;
  }
  const xpCurrent = Math.max(0, Math.floor(xp - consumed));
  const xpForNext = level >= definition.maxLevel ? 0 : definition.xpCurve[level - 1] ?? 0;
  return { level, xpCurrent, xpForNext, progress: xpForNext > 0 ? Math.min(1, xpCurrent / xpForNext) : 0 };
}
