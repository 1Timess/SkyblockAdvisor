import { z } from "zod";

export const neuPetConstantsSchema = z.object({
  pet_rarity_offset: z.record(z.string(), z.number().int().nonnegative()),
  pet_levels: z.array(z.number().nonnegative()),
  custom_pet_leveling: z.record(z.string(), z.object({
    type: z.number().optional(),
    pet_levels: z.array(z.number().nonnegative()).optional(),
    max_level: z.number().int().positive().optional(),
    rarity_offset: z.record(z.string(), z.number().int().nonnegative()).optional(),
    xp_multiplier: z.number().positive().optional(),
  }).passthrough()).default({}),
  pet_types: z.record(z.string(), z.string()).default({}),
  pet_item_display_name_to_id: z.record(z.string(), z.string()).default({}),
}).passthrough();

export type NeuPetConstants = z.infer<typeof neuPetConstantsSchema>;
