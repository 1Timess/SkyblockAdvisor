import { z } from "zod";
import { raritySchema, statsSchema } from "./items";

export const itemRequirementSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("SKILL_LEVEL"), skill: z.string(), level: z.number().int().nonnegative(), sourceText: z.string() }),
  z.object({ kind: z.literal("SLAYER_LEVEL"), slayer: z.string(), level: z.number().int().nonnegative(), sourceText: z.string() }),
  z.object({ kind: z.literal("DUNGEON_LEVEL"), level: z.number().int().nonnegative(), sourceText: z.string() }),
  z.object({ kind: z.literal("DUNGEON_FLOOR"), floor: z.number().int().nonnegative(), sourceText: z.string() }),
  z.object({ kind: z.literal("HEART_OF_THE_MOUNTAIN"), tier: z.number().int().nonnegative(), sourceText: z.string() }),
  z.object({ kind: z.literal("GARDEN_LEVEL"), level: z.number().int().nonnegative(), sourceText: z.string() }),
]);
export type ItemRequirement = z.infer<typeof itemRequirementSchema>;

export const candidateItemSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), rarity: raritySchema.nullable(), categories: z.array(z.string()),
  stats: statsSchema, lore: z.array(z.string()), abilityText: z.array(z.string()), setBonusText: z.array(z.string()),
  requirements: z.array(itemRequirementSchema), unparsedRequirementText: z.array(z.string()),
  wiki: z.string().url().nullable(), marketKey: z.string().min(1),
  sources: z.object({ hypixel: z.literal(true), neu: z.boolean() }),
});
export type CandidateItem = z.infer<typeof candidateItemSchema>;

export const requirementCheckSchema = z.object({
  requirement: itemRequirementSchema,
  status: z.enum(["MET", "NOT_MET", "UNKNOWN"]),
  actual: z.number().nonnegative().nullable(),
});
export type RequirementCheck = z.infer<typeof requirementCheckSchema>;
