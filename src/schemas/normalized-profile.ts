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
  highestMagicalPower: z.number().nullable(), unlockedPowers: z.array(z.string()), bagUpgradesPurchased: z.number().nullable(),
  tuning: z.object({ highestUnlockedSlot: z.number().nullable(), slots: z.record(z.string(), statsSchema) }),
  magicalPower: z.object({ total: z.number(), accessories: z.number(), riftPrism: z.number(),
    byRarity: z.record(z.string(), z.object({ count: z.number(), mp: z.number() })),
  }),
  owned: z.array(profileItemSchema.extend({ active: z.boolean(), inactiveReason: z.string().nullable() })),
  missing: z.array(accessoryReferenceSchema), upgrades: z.array(accessoryReferenceSchema),
});
export type AccessorySummary = z.infer<typeof accessorySchema>;
const gearSection = z.object({ items: z.array(profileItemSchema), stats: statsSchema });
export const progressionNodeSchema = z.object({ level: z.number().nullable(), value: z.number().nullable(), enabled: z.boolean().nullable(),
  state: z.record(z.string(), z.union([z.number(), z.boolean()])) });
const dynamicStateSchema = z.record(z.string(), z.unknown());
const miningCrystalSchema = z.object({ rawId: z.string(), state: z.string().nullable(), totalFound: z.number().nullable(), totalPlaced: z.number().nullable() });
const crystalHollowsSchema = z.object({ available: z.boolean(), crystals: z.record(z.string(), miningCrystalSchema),
  nucleus: z.object({ required: z.array(z.string()), acquired: z.array(z.string()), placed: z.array(z.string()),
    missing: z.array(z.string()), ready: z.boolean(), complete: z.boolean() }), biomes: dynamicStateSchema });
const miningProgressionSchema = z.object({
  treeExperience: z.number().nullable(), hotmLevel: z.number().nullable(), nodes: z.record(z.string(), progressionNodeSchema),
  selectedAbility: z.string().nullable(), selectedAbilities: z.record(z.string(), z.string()),
  selectedTreeSlot: z.union([z.string(), z.number()]).nullable(), selectedTreeSlots: statsSchema,
  tokensSpent: z.number().nullable(), tokensSpentByTree: statsSchema, lastReset: z.number().nullable(),
  powder: z.object({ mithril: z.number().nullable(), mithrilTotal: z.number().nullable(), mithrilSpent: z.number().nullable(),
    gemstone: z.number().nullable(), gemstoneTotal: z.number().nullable(), gemstoneSpent: z.number().nullable(),
    glacite: z.number().nullable(), glaciteTotal: z.number().nullable(), glaciteSpent: z.number().nullable(), glaciteSpent2: z.number().nullable(),
    nonRefundableGlaciteSpent: z.number().nullable(), nonRefundableGlaciteSpent2: z.number().nullable(),
    nonRefundableMithrilSpent: z.number().nullable(), nonRefundableMithrilSpent2: z.number().nullable() }),
  dailyOres: z.object({ total: z.number().nullable(), gemstone: z.number().nullable(), glacite: z.number().nullable(), mithrilOre: z.number().nullable() }),
  crystalHollows: crystalHollowsSchema,
  glaciteTunnels: z.object({ available: z.boolean(), mineshaftsEntered: z.number().nullable(), corpsesLooted: statsSchema,
    totalCorpsesLooted: z.number().nullable(), fossilsDonated: z.array(z.string()), fossilDust: z.number().nullable(), coldResistance: z.number().nullable() }),
  crystals: dynamicStateSchema, biomes: dynamicStateSchema,
});
const foragingProgressionSchema = z.object({ treeExperience: z.number().nullable(), nodes: z.record(z.string(), progressionNodeSchema),
  sweepLevel: z.number().nullable(), foragingFortuneNodeLevel: z.number().nullable(), core: dynamicStateSchema });
const fishingProgressionSchema = z.object({ itemsFished: statsSchema, seaCreatureKills: z.number().nullable(), trophyFish: statsSchema });
const bestiarySchema = z.object({ kills: statsSchema, deaths: statsSchema, milestone: statsSchema, miscellaneous: statsSchema });
export const normalizedProfileSchema = z.object({
  identity: profilesResponseSchema.shape.identity,
  profile: profileSummarySchema.extend({ availableProfiles: z.array(profileSummarySchema) }),
  economy: z.object({ purse: z.number().nullable(), bank: z.number().nullable(), personalBank: z.number().nullable() }),
  gear: z.object({ armor: gearSection, equipment: gearSection, weapons: z.array(profileItemSchema),
    loadouts: z.object({ names: z.record(z.string(), z.string()),
      armor: z.object({ equippedSet: z.number().nullable(), sets: z.record(z.string(), z.record(z.string(), profileItemSchema)) }),
      equipment: z.object({ equippedSet: z.number().nullable(), sets: z.record(z.string(), z.record(z.string(), profileItemSchema)) }) }) }),
  inventoryItems: z.array(profileItemSchema),
  accessories: accessorySchema,
  pets: z.object({ owned: z.array(petSchema), activePet: petSchema.nullable() }),
  progression: z.object({ skills: z.record(z.string(), levelSchema), slayers: z.record(z.string(), slayerSchema), dungeons: dungeonSchema,
    mining: miningProgressionSchema, foraging: foragingProgressionSchema, fishing: fishingProgressionSchema }),
  attributes: statsSchema,
  shards: z.object({ owned: z.unknown().nullable(), fused: z.unknown().nullable(), traps: z.unknown().nullable() }),
  collections: statsSchema, unlockedCollectionTiers: z.array(z.string()), craftedGenerators: z.array(z.string()),
  playerStats: z.object({ highestDamage: z.number().nullable(), highestCriticalDamage: z.number().nullable(), kills: statsSchema,
    deaths: statsSchema, itemsFished: statsSchema, seaCreatureKills: z.number().nullable(), pets: statsSchema,
    auctions: statsSchema, races: statsSchema, rift: statsSchema }),
  bestiary: bestiarySchema,
  otherProgression: z.object({ fairySoul: z.unknown().nullable(), leveling: z.unknown().nullable(), jacobsContest: z.unknown().nullable(),
    garden: z.unknown().nullable(), forge: z.unknown().nullable(), netherIsland: z.unknown().nullable(), rift: z.unknown().nullable() }),
  warnings: z.array(warningSchema),
  meta: z.object({ fetchedAt: z.string(), sourceUpdatedAt: z.string().optional() }),
});
export type NormalizedSkyBlockProfile = z.infer<typeof normalizedProfileSchema>;
