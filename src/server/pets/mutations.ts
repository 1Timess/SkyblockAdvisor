import type { OwnedPetSetup } from "../../schemas/owned-pet-setup";
import type { CanonicalPetDefinition, CanonicalPetItemDefinition } from "../../schemas/pet-mechanics";
import { petMutationSchema, type PetMutation, type PetMutationSetupState } from "../../schemas/pet-mutations";

const rarityTiers = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export function buildPetMutations(input: {
  setups: readonly OwnedPetSetup[];
  definitions: readonly CanonicalPetDefinition[];
  petItems?: readonly CanonicalPetItemDefinition[];
  candidatePetIds?: readonly string[];
  candidatePetItemIds?: readonly string[];
}): PetMutation[] {
  const definitions = new Map(input.definitions.map(value => [value.id, value]));
  const petItems = new Map((input.petItems ?? []).map(value => [value.itemId, value]));
  const mutations: PetMutation[] = [];

  for (const setup of input.setups) {
    if (!setup.canonicalPetId) continue;
    const definition = definitions.get(setup.canonicalPetId);
    if (!definition || setup.level == null || setup.maxLevel == null) continue;
    const before = setupState(setup, definition);

    for (const path of definition.upgradePaths) {
      const output = definitions.get(path.outputId);
      if (!output || path.inputId !== definition.id) continue;
      const effectiveRarity = setup.effectiveRarity === setup.baseRarity ? output.rarity : setup.effectiveRarity;
      const rarityUncertainty = setup.effectiveRarity === setup.baseRarity ? [] : ["Effective rarity depends on the preserved held-item mechanic."];
      const after = { ...before, canonicalPetId: output.id, baseRarity: output.rarity, effectiveRarity, maxLevel: output.maxLevel };
      mutations.push(petMutationSchema.parse({
        mutationId: `pet:kat:${setup.setupId}:${output.id}`, kind: "KAT_UPGRADE",
        assessment: rarityIndex(output.rarity) > rarityIndex(definition.rarity) ? "PROGRESSION" : "UNCERTAIN",
        sourceSetupId: setup.setupId, before, after,
        requirements: { coins: path.coins, timeSeconds: path.timeSeconds, itemCosts: path.itemCosts, marketPriceRequired: path.coins == null },
        reasons: [`Canonical KAT path ${definition.id} -> ${output.id}`], uncertainty: rarityUncertainty,
      }));
    }

    for (const target of meaningfulLevelTargets(before.level, before.maxLevel)) {
      mutations.push(petMutationSchema.parse({
        mutationId: `pet:level:${setup.setupId}:${target}`, kind: "LEVEL_TARGET", assessment: "PROGRESSION",
        sourceSetupId: setup.setupId, before, after: { ...before, level: target },
        requirements: { coins: null, timeSeconds: null, itemCosts: [], marketPriceRequired: false },
        reasons: [`Advance this concrete setup from level ${before.level} to level ${target}`],
        uncertainty: ["Time and XP-source cost are not priced in 5.3D."],
      }));
    }

    for (const itemId of input.candidatePetItemIds ?? []) {
      if (itemId === setup.heldItem || !petItems.has(itemId)) continue;
      mutations.push(petMutationSchema.parse({
        mutationId: `pet:item:${setup.setupId}:${itemId}`, kind: "CHANGE_HELD_ITEM", assessment: "SIDEGRADE",
        sourceSetupId: setup.setupId, before, after: { ...before, heldItem: itemId },
        requirements: { coins: null, timeSeconds: null, itemCosts: [{ itemId, count: 1 }], marketPriceRequired: true },
        reasons: ["Held-item changes preserve the rest of the concrete pet setup."],
        uncertainty: ["5.3D does not rank held-item effects; domain/context evaluation occurs downstream."],
      }));
    }
  }

  const ownedIds = new Set(input.setups.map(value => value.canonicalPetId).filter(Boolean));
  for (const id of input.candidatePetIds ?? []) {
    const definition = definitions.get(id);
    if (!definition || ownedIds.has(id)) continue;
    const after: PetMutationSetupState = {
      type: definition.type, canonicalPetId: definition.id, baseRarity: definition.rarity,
      effectiveRarity: definition.rarity, level: 1, maxLevel: definition.maxLevel, heldItem: null,
    };
    mutations.push(petMutationSchema.parse({
      mutationId: `pet:acquire:${id}`, kind: "ACQUIRE", assessment: "UNCERTAIN",
      sourceSetupId: null, before: null, after,
      requirements: { coins: null, timeSeconds: null, itemCosts: [], marketPriceRequired: true },
      reasons: ["Acquire a concrete canonical pet variant."],
      uncertainty: ["Acquisition method and market price are intentionally deferred to 5.3E."],
    }));
  }

  return dedupeMutations(mutations);
}

function setupState(setup: OwnedPetSetup, definition: CanonicalPetDefinition): PetMutationSetupState {
  return {
    type: setup.type, canonicalPetId: definition.id, baseRarity: setup.baseRarity,
    effectiveRarity: setup.effectiveRarity, level: setup.level!, maxLevel: setup.maxLevel!, heldItem: setup.heldItem,
  };
}

function meaningfulLevelTargets(level: number, maxLevel: number): number[] {
  if (level >= maxLevel) return [];
  const targets = new Set<number>();
  for (const milestone of [25, 50, 75, 100, 150, 200]) if (milestone > level && milestone <= maxLevel) targets.add(milestone);
  targets.add(maxLevel);
  return [...targets].sort((a, b) => a - b);
}

function rarityIndex(rarity: string) {
  return rarityTiers.indexOf(rarity.toLowerCase() as typeof rarityTiers[number]);
}

function dedupeMutations(values: PetMutation[]) {
  const seen = new Set<string>();
  return values.filter(value => !seen.has(value.mutationId) && !!seen.add(value.mutationId));
}
