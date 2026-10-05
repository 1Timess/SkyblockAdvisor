import "server-only";
import { readFileSync } from "node:fs";
import type { RawMember } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";
import type { NormalizedPet } from "../../../schemas/pets";
import { effectivePetRarity, getPetLevel } from "../../reference/pet-leveling";
import { neuPetNumsPath } from "../../reference/neu/paths";

type PetStatTier = {
  level1?: { statNums?: Record<string, number>; otherNums?: number[] };
  level100?: { statNums?: Record<string, number>; otherNums?: number[] };
  stats_levelling_curve?: string;
  statsLevelingCurve?: string;
};

type PetNums = Record<string, Record<string, PetStatTier>>;

let petNumsCache: PetNums | null = null;
function loadPetNums(): PetNums {
  if (petNumsCache) return petNumsCache;
  try {
    petNumsCache = JSON.parse(readFileSync(neuPetNumsPath(), "utf8")) as PetNums;
  } catch {
    petNumsCache = {};
  }
  return petNumsCache;
}

const statKeyMap: Record<string, string> = {
  health: "health", defense: "defense", strength: "strength", intelligence: "intelligence",
  speed: "speed", crit_chance: "critChance", crit_damage: "critDamage", attack_speed: "attackSpeed",
  bonus_attack_speed: "attackSpeed", ferocity: "ferocity", magic_find: "magicFind", pet_luck: "petLuck",
  mining_speed: "miningSpeed", mining_fortune: "miningFortune", gemstone_fortune: "gemstoneFortune",
  pristine: "pristine", farming_fortune: "farmingFortune", foraging_fortune: "foragingFortune",
  foraging_wisdom: "foragingWisdom", fishing_speed: "fishingSpeed", sea_creature_chance: "seaCreatureChance",
  ability_damage: "abilityDamage",
};

function normalizePetStatKey(key: string) {
  const normalized = key.trim().toLowerCase().replaceAll(" ", "_");
  return statKeyMap[normalized] ?? normalized.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function getTierData(petNums: PetNums, type: string, rarity: string) {
  const byType = petNums[type];
  if (!byType) return null;
  return byType[rarity.toUpperCase()] ?? byType[rarity.toLowerCase()] ?? null;
}

function calculatePetStats(petNums: PetNums, type: string, rarity: string, level: number | null) {
  if (level === null) return {};
  const tier = getTierData(petNums, type, rarity);
  const min = tier?.level1, max = tier?.level100;
  if (!tier || !min?.statNums || !max?.statNums) return {};

  let minStatsLevel = 0, maxStatsLevel = 100, statsLevelingType = -1, statsLevel = level;
  const curve = tier.stats_levelling_curve ?? tier.statsLevelingCurve;
  if (curve) {
    const parts = curve.split(/[:;]/).map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      [minStatsLevel, maxStatsLevel, statsLevelingType] = parts;
      if (statsLevelingType === 0 || statsLevelingType === 1) {
        if (level < minStatsLevel) statsLevel = 1;
        else if (level < maxStatsLevel) statsLevel = level - minStatsLevel + 1;
        else statsLevel = maxStatsLevel - minStatsLevel + 1;
      }
    }
  }

  const minMix = (maxStatsLevel - (minStatsLevel - (statsLevelingType === -1 ? 0 : 1)) - statsLevel) / 99;
  const maxMix = (statsLevel - 1) / 99;
  const output: Record<string, number> = {};

  for (const [rawKey, maxValue] of Object.entries(max.statNums)) {
    if (statsLevelingType === 1 && level < minStatsLevel) continue;
    const minValue = min.statNums[rawKey] ?? 0;
    const value = Math.floor(minValue * minMix + maxValue * maxMix);
    if (Number.isFinite(value) && value !== 0) output[normalizePetStatKey(rawKey)] = value;
  }

  if (max.otherNums?.length) {
    for (let i = 0; i < max.otherNums.length; i++) {
      if (statsLevelingType === 1 && level < minStatsLevel) continue;
      const minValue = min.otherNums?.[i] ?? 0;
      const value = minValue * minMix + max.otherNums[i] * maxMix;
      if (Number.isFinite(value) && value !== 0) output[`otherNum_${i}`] = Math.floor(value * 10) / 10;
    }
  }

  return output;
}

export function buildPets(member: RawMember, warnings: ProfileWarning[], includeReferenceStats = true) {
  const rawPets = member.pets_data?.pets;
  if (!rawPets) warnings.push({ code: "PARTIAL_PROFILE", scope: "pets", message: "Owned pets were not supplied." });
  const petNums = includeReferenceStats ? loadPetNums() : {};
  const owned: NormalizedPet[] = (rawPets ?? []).map(pet => {
    const rarity = pet.tier?.toLowerCase() ?? "unknown", type = pet.type ?? "UNKNOWN";
    const xp = pet.exp ?? 0;
    const level = pet.exp === undefined ? null : getPetLevel(xp, rarity, type);
    if (!level) warnings.push({ code: "REFERENCE_DATA_MISSING", scope: "pets", message: `Pet level unavailable for ${type}: missing XP or unsupported rarity.` });
    const effectiveRarity = effectivePetRarity(rarity, pet.heldItem);
    return {
      uuid: pet.uuid ?? pet.uniqueId ?? null, type, name: type.toLowerCase().split("_").map(word => word[0].toUpperCase() + word.slice(1)).join(" "),
      rarity, effectiveRarity,
      level: level?.level ?? null, maxLevel: level?.maxLevel ?? null, xp, xpCurrent: level?.xpCurrent ?? null,
      xpForNext: level?.xpForNext ?? null, progress: level?.progress ?? null, active: pet.active ?? false,
      heldItem: pet.heldItem ?? null, candyUsed: pet.candyUsed ?? 0, skin: pet.skin ?? null,
      stats: calculatePetStats(petNums, type, effectiveRarity, level?.level ?? null), abilityLore: [],
    };
  });
  return { owned, activePet: owned.find(pet => pet.active) ?? null };
}