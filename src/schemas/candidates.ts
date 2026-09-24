import { z } from "zod";
import { candidateItemSchema } from "./catalog";
import { marketConfidenceSchema } from "./market";

export const candidatePriceSchema = z.object({
  coins: z.number().int().nonnegative(),
  observedAt: z.string().datetime(),
  confidence: marketConfidenceSchema,
});

const statChangeSchema = z.object({ current: z.number().nullable(), candidate: z.number().nullable() });

export const advisorCandidateSchema = z.object({
  id: z.string().min(1),
  domain: z.enum(["armor", "weapon", "accessory", "pet", "tool"]),
  item: candidateItemSchema,
  price: candidatePriceSchema.optional(),
  knownChanges: z.record(z.string(), statChangeSchema).optional(),
  requirements: z.array(z.string()),
  abilityText: z.array(z.string()),
  setBonusText: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type AdvisorCandidate = z.infer<typeof advisorCandidateSchema>;

export const armorLaneNames = ["defense", "health", "strength", "critDamage", "intelligence", "speed"] as const;
export type ArmorLaneName = typeof armorLaneNames[number];

export const armorCandidateLanesSchema = z.object({
  slot: z.enum(["helmet", "chestplate", "leggings", "boots"]),
  lanes: z.record(z.enum(armorLaneNames), z.array(advisorCandidateSchema).max(6)),
  candidates: z.array(advisorCandidateSchema).max(20),
});
export type ArmorCandidateLanes = z.infer<typeof armorCandidateLanesSchema>;

export const weaponLaneNames = ["damage", "strength", "critDamage", "intelligence", "attackSpeed", "ability"] as const;
export type WeaponLaneName = typeof weaponLaneNames[number];

export const weaponCandidateLanesSchema = z.object({
  weaponType: z.enum(["sword", "bow", "wand", "fishing_rod"]).nullable(),
  lanes: z.record(z.enum(weaponLaneNames), z.array(advisorCandidateSchema).max(6)),
  candidates: z.array(advisorCandidateSchema).max(20),
});
export type WeaponCandidateLanes = z.infer<typeof weaponCandidateLanesSchema>;

export const accessoryLaneNames = ["missing", "rarityUpgrade", "cheapestMp", "recombobulation", "enrichment"] as const;
export type AccessoryLaneName = typeof accessoryLaneNames[number];

export const accessoryCandidateLanesSchema = z.object({
  lanes: z.record(z.enum(accessoryLaneNames), z.array(advisorCandidateSchema).max(6)),
  candidates: z.array(advisorCandidateSchema).max(20),
});
export type AccessoryCandidateLanes = z.infer<typeof accessoryCandidateLanesSchema>;

export const petLaneNames = ["owned", "levelTarget", "rarityUpgrade", "roleProgression"] as const;
export type PetLaneName = typeof petLaneNames[number];

export const petCandidateLanesSchema = z.object({
  lanes: z.record(z.enum(petLaneNames), z.array(advisorCandidateSchema).max(6)),
  candidates: z.array(advisorCandidateSchema).max(20),
});
export type PetCandidateLanes = z.infer<typeof petCandidateLanesSchema>;
