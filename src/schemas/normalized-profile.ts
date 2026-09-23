import { z } from "zod";
import { profileItemSchema, raritySchema, statsSchema, warningSchema } from "./items";
import { dungeonSchema, levelSchema, slayerSchema } from "./progression";
import { petSchema } from "./pets";

export const profileSummarySchema = z.object({ id: z.string(), cuteName: z.string(), selected: z.boolean(), gameMode: z.string().nullable() });
export const profilesResponseSchema = z.object({
  identity: z.object({ username: z.string(), uuid: z.string().regex(/^[a-f0-9]{32}$/) }),
  profiles: z.array(profileSummarySchema),
});
export const accessoryReferenceSchema = z.object({
  id: z.string(), name: z.string(), rarity: raritySchema.nullable(),
  allowedRarities: z.array(raritySchema).optional(), recombobulationAllowed: z.boolean().optional(), enrichmentAllowed: z.boolean().optional(),
});
export type AccessoryReference = z.infer<typeof accessoryReferenceSchema>;
export const accessorySchema = z.object({
  selectedPower: z.string().nullable(),
  magicalPower: z.object({ total: z.number(), accessories: z.number(), riftPrism: z.number(),
    byRarity: z.record(z.string(), z.object({ count: z.number(), mp: z.number() })),
  }),
  owned: z.array(profileItemSchema.extend({ active: z.boolean(), inactiveReason: z.string().nullable() })),
  missing: z.array(accessoryReferenceSchema), upgrades: z.array(accessoryReferenceSchema),
});
export type AccessorySummary = z.infer<typeof accessorySchema>;
const gearSection = z.object({ items: z.array(profileItemSchema), stats: statsSchema });
export const normalizedProfileSchema = z.object({
  identity: profilesResponseSchema.shape.identity,
  profile: profileSummarySchema.extend({ availableProfiles: z.array(profileSummarySchema) }),
  economy: z.object({ purse: z.number().nullable(), bank: z.number().nullable(), personalBank: z.number().nullable() }),
  gear: z.object({ armor: gearSection, equipment: gearSection, weapons: z.array(profileItemSchema) }),
  accessories: accessorySchema,
  pets: z.object({ owned: z.array(petSchema), activePet: petSchema.nullable() }),
  progression: z.object({ skills: z.record(z.string(), levelSchema), slayers: z.record(z.string(), slayerSchema), dungeons: dungeonSchema }),
  warnings: z.array(warningSchema),
  meta: z.object({ fetchedAt: z.string(), sourceUpdatedAt: z.string().optional() }),
});
export type NormalizedSkyBlockProfile = z.infer<typeof normalizedProfileSchema>;
