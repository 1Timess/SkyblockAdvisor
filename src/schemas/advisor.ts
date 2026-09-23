import { z } from "zod";
import { marketConfidenceSchema } from "./market";
import { raritySchema, statsSchema } from "./items";

const compactItemSchema = z.object({
  id: z.string().nullable(), name: z.string(), rarity: raritySchema.nullable(), categories: z.array(z.string()), stats: statsSchema,
  abilityText: z.array(z.string()), setBonusText: z.array(z.string()),
});

export const compactAdvisorCandidateSchema = z.object({
  id: z.string(), domain: z.enum(["armor", "weapon", "accessory", "pet"]), name: z.string(), rarity: raritySchema.nullable(),
  categories: z.array(z.string()), stats: statsSchema,
  price: z.object({ coins: z.number().int().nonnegative(), observedAt: z.string().datetime(), confidence: marketConfidenceSchema }).nullable(),
  knownChanges: z.record(z.string(), z.object({ current: z.number().nullable(), candidate: z.number().nullable() })),
  requirements: z.array(z.string()), abilityText: z.array(z.string()), setBonusText: z.array(z.string()), warnings: z.array(z.string()),
});

export const advisorContextSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  player: z.object({
    economy: z.object({ purse: z.number().nullable(), bank: z.number().nullable(), personalBank: z.number().nullable() }),
    skills: z.record(z.string(), z.object({ level: z.number(), maxLevel: z.number() })),
    slayers: z.record(z.string(), z.object({ level: z.number(), xp: z.number() })),
    dungeons: z.object({ catacombsLevel: z.number().nullable(), selectedClass: z.string().nullable(), highestFloorNormal: z.number().nullable(), highestFloorMaster: z.number().nullable() }),
  }),
  currentGear: z.object({
    armor: z.array(compactItemSchema), equipment: z.array(compactItemSchema), likelyWeapons: z.array(compactItemSchema),
    activePet: z.object({ type: z.string(), name: z.string(), rarity: z.string(), level: z.number().nullable(), heldItem: z.string().nullable(), stats: statsSchema, abilityLore: z.array(z.string()) }).nullable(),
    magicalPower: z.number(),
  }),
  candidates: z.array(compactAdvisorCandidateSchema).max(32),
  warnings: z.array(z.string()),
});
export type AdvisorContext = z.infer<typeof advisorContextSchema>;

export const advisorResponseSchema = z.object({
  headline: z.string().min(1),
  actions: z.array(z.object({
    rank: z.number().int().positive(), candidateId: z.string().nullable(), action: z.string().min(1), why: z.string().min(1),
    tradeoffs: z.array(z.string()), prerequisites: z.array(z.string()), uncertainty: z.string().nullable(),
  })).min(1).max(5),
  caveats: z.array(z.string()),
});
export type AdvisorResponse = z.infer<typeof advisorResponseSchema>;
