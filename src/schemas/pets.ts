import { z } from "zod";
import { statsSchema } from "./items";

export const petSchema = z.object({
  uuid: z.string().nullable(), type: z.string(), name: z.string(), rarity: z.string(), effectiveRarity: z.string(),
  level: z.number().nullable(), maxLevel: z.number().nullable(), xp: z.number(), xpCurrent: z.number().nullable(),
  xpForNext: z.number().nullable(), progress: z.number().nullable(), active: z.boolean(),
  heldItem: z.string().nullable(), candyUsed: z.number(), skin: z.string().nullable(),
  stats: statsSchema, abilityLore: z.array(z.string()),
});
export type NormalizedPet = z.infer<typeof petSchema>;
