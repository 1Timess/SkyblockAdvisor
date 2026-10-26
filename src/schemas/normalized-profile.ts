import { z } from "zod";
import { profileItemSchema, raritySchema, statsSchema, warningSchema } from "./items";
import { dungeonSchema, levelSchema, slayerSchema } from "./progression";
import { petSchema } from "./pets";
import { ownedEnchantingStateSchema } from "./owned-enchanting";

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
export const accessoryUpgradeSchema = accessoryReferenceSchema.extend({ price: z.number().nullable() });
export type AccessoryUpgrade = z.infer<typeof accessoryUpgradeSchema>;
export const accessorySchema = z.object({
  selectedPower: z.string().nullable(),
  highestMagicalPower: z.number().nullable(), unlockedPowers: z.array(z.string()), bagUpgradesPurchased: z.number().nullable(),
  tuning: z.object({ highestUnlockedSlot: z.number().nullable(), slots: z.record(z.string(), statsSchema) }),
  magicalPower: z.object({ total: z.number(), accessories: z.number(), riftPrism: z.number(),
    byRarity: z.record(z.string(), z.object({ count: z.number(), mp: z.number() })),
  }),
  owned: z.array(profileItemSchema.extend({ active: z.boolean(), inactiveReason: z.string().nullable() })),
  missing: z.array(accessoryReferenceSchema), upgrades: z.array(accessoryUpgradeSchema),
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
const foragingProgressionSchema = z.object({
  treeExperience: z.number().nullable(),
  hotfLevel: z.number().nullable(),
  extraLevelCap: z.number().nullable(),
  presets: z.record(z.string(), z.object({ nodes: z.record(z.string(), progressionNodeSchema) })),
  activePreset: z.number().nullable(),
  nodes: z.record(z.string(), progressionNodeSchema),
  selectedAbility: z.string().nullable(),
  selectedAbilities: z.record(z.string(), z.string()),
  tokensSpentByPreset: statsSchema,
  sweepLevel: z.number().nullable(),
  foragingFortuneNodeLevel: z.number().nullable(),
  core: dynamicStateSchema,
  whispers: z.object({
    forest: z.object({ total: z.number().nullable(), spentByPreset: statsSchema }),
    desert: z.object({ total: z.number().nullable(), spentByPreset: statsSchema }),
  }),
  treeGifts: z.object({ counts: statsSchema, milestoneTierClaimed: statsSchema }),
  hina: dynamicStateSchema,
  starlyn: dynamicStateSchema,
});
const fishingProgressionSchema = z.object({ itemsFished: statsSchema, seaCreatureKills: z.number().nullable(), trophyFish: statsSchema });
const bestiaryFamilyProgressSchema=z.object({
  name:z.string(),keys:z.array(z.string()),imageUrl:z.string().nullable(),itemId:z.string().nullable(),
  kills:z.number().nonnegative(),deaths:z.number().nonnegative(),tier:z.number().int().nonnegative(),
  maxTier:z.number().int().nonnegative(),nextThreshold:z.number().nonnegative().nullable(),
  remaining:z.number().nonnegative(),progress:z.number().min(0).max(1),
});
const bestiaryProgressSchema=z.object({
  apiAvailable:z.boolean(),categories:z.array(z.object({
    id:z.string(),name:z.string(),group:z.string(),discovered:z.number().int().nonnegative(),
    maxed:z.number().int().nonnegative(),familyTiers:z.number().int().nonnegative(),
    maxFamilyTiers:z.number().int().nonnegative(),families:z.array(bestiaryFamilyProgressSchema),
  })),
  familyTiers:z.number().int().nonnegative(),maxFamilyTiers:z.number().int().nonnegative(),
  bestiaryLevel:z.number().int().nonnegative(),levelProgress:z.number().min(0).max(1),
  nextMilestonePoints:z.number().int().positive(),pointsToNextMilestone:z.number().int().positive(),
  claimedMilestone:z.number().nonnegative().nullable(),discovered:z.number().int().nonnegative(),
  maxed:z.number().int().nonnegative(),totalFamilies:z.number().int().nonnegative(),
  unmappedKillKeys:z.array(z.string()),
});
const bestiarySchema = z.object({ kills: statsSchema, deaths: statsSchema, milestone: statsSchema, miscellaneous: statsSchema,
  progression:bestiaryProgressSchema });
const minionProgressSchema = z.object({
  available: z.boolean(),
  historyComplete: z.boolean(),
  uniqueCrafts: z.number().int().nonnegative(),
  craftedSlots: z.number().int().nonnegative().nullable(),
  bonusSlots: z.number().int().nonnegative().nullable(),
  totalSlots: z.number().int().nonnegative().nullable(),
  nextSlotAt: z.number().int().positive().nullable(),
  craftsToNextSlot: z.number().int().nonnegative().nullable(),
  families: z.array(z.object({
    id: z.string(), name: z.string(), itemId: z.string().nullable(),
    craftedTiers: z.array(z.number().int().positive()),
    maxCraftedTier: z.number().int().nonnegative(),
    maxCatalogTier: z.number().int().positive().nullable(),
    nextTier: z.number().int().positive().nullable(),
    nextItemId: z.string().nullable(),
  })),
  catalogAvailable: z.boolean(),
});
const collectionTabTierSchema=z.object({
 tier:z.number().int().positive(),required:z.number().nonnegative(),unlocks:z.array(z.string()),
 confirmed:z.boolean(),thresholdObserved:z.boolean(),
});
const collectionsTabSchema=z.object({
 referenceAvailable:z.boolean(),referenceVersion:z.string().nullable(),
 contributionsComplete:z.boolean(),unlocksComplete:z.boolean(),observedMembers:z.number().int().nonnegative(),
 totalMembers:z.number().int().nonnegative(),totalCollections:z.number().int().nonnegative(),
 discovered:z.number().int().nonnegative(),maxed:z.number().int().nonnegative(),
 earnedTiers:z.number().int().nonnegative(),maxTiers:z.number().int().nonnegative(),
 categories:z.array(z.object({
  name:z.string(),count:z.number().int().nonnegative(),discovered:z.number().int().nonnegative(),
  maxed:z.number().int().nonnegative(),earnedTiers:z.number().int().nonnegative(),maxTiers:z.number().int().nonnegative(),
 })),
 collections:z.array(z.object({
  id:z.string(),name:z.string(),category:z.string(),personal:z.number().nonnegative().nullable(),
  observed:z.number().nonnegative().nullable(),confirmedTier:z.number().int().nonnegative(),
  inferredTier:z.number().int().nonnegative().nullable(),earnedTier:z.number().int().nonnegative(),
  maxTier:z.number().int().nonnegative(),maxed:z.boolean(),nextTier:z.number().int().positive().nullable(),
  nextRequired:z.number().nonnegative().nullable(),remaining:z.number().nonnegative().nullable(),
  progress:z.number().min(0).max(1).nullable(),tiers:z.array(collectionTabTierSchema),
 })),
});
const crimsonQuestSchema=z.object({
 questApiAvailable:z.boolean(),netherQuestApiAvailable:z.boolean(),
 storyline:z.array(z.object({id:z.string(),label:z.string(),branch:z.string(),
  status:z.enum(["COMPLETE","ACTIVE","INACTIVE","UNKNOWN"]),available:z.boolean(),
  progress:z.number().nullable(),completedAt:z.number().nullable(),
 })),
 branches:z.array(z.object({id:z.string(),reported:z.boolean(),allKnownStepsComplete:z.boolean(),
  observedComplete:z.number().int().nonnegative(),totalMappedSteps:z.number().int().nonnegative(),
  completionVerified:z.boolean()})),
 unknownStorylineKeys:z.array(z.string()),
 laterObjectives:z.array(z.object({id:z.string(),status:z.enum(["COMPLETE","ACTIVE","INACTIVE","UNKNOWN"]),completedAt:z.number().nullable()})),
 objectiveSignals:z.array(z.string()),
 storyEvidence:z.object({reportedSteps:z.number().int().nonnegative(),
  completedSteps:z.number().int().nonnegative(),activeSteps:z.number().int().nonnegative(),
  historicallyAccessedKuudra:z.boolean()}),
 daily:z.object({available:z.boolean(),assignments:z.array(z.string()),
  entries:z.array(z.object({id:z.string(),label:z.string(),available:z.boolean(),
   status:z.string().nullable(),progress:z.number().nullable(),completedAt:z.number().nullable()})),
  extraKeys:z.array(z.string()),rewardEntries:z.array(z.object({id:z.string(),reward:z.string()}))}),
});
const crimsonArmorRequirementsSchema=z.object({
 combatLevelRequired:z.number().int().positive(),kuudraTierRequired:z.string(),
 combatMet:z.boolean().nullable(),kuudraClearMet:z.boolean().nullable(),
});
const crimsonUpgradeIngredientSchema=z.object({
 id:z.string(),quantity:z.number().int().positive(),unitPrice:z.number().nonnegative().nullable(),
 estimatedCoins:z.number().nonnegative().nullable(),
 basis:z.enum(["LOWEST_BIN","MEDIAN_LOWEST_FIVE","BAZAAR","OTHER"]).nullable(),
 observedAt:z.string().nullable(),
});
const crimsonCostSummarySchema=z.object({
 steps:z.number().int().nonnegative(),recipeComplete:z.boolean(),
 ingredients:z.array(crimsonUpgradeIngredientSchema),directCoins:z.number().nonnegative(),
 estimatedMaterialCoins:z.number().nonnegative().nullable(),
 estimatedTotalCoins:z.number().nonnegative().nullable(),missingPriceIds:z.array(z.string()),
});
const crimsonUpgradeStepSchema=z.object({
 action:z.enum(["STAR","PRESTIGE"]),fromTier:z.string(),toTier:z.string(),
 fromStars:z.number().int().nonnegative(),toStars:z.number().int().nonnegative(),
 requirements:z.array(z.object({id:z.string(),quantity:z.number().int().positive()})),
 recipeComplete:z.boolean(),source:z.string(),
});
const crimsonEquipmentSchema=z.object({available:z.boolean(),trackedPieces:z.number().int().nonnegative(),
 pieces:z.array(z.object({
 id:z.string(),uuid:z.string().nullable(),name:z.string(),source:z.string(),
 slot:z.string(),family:z.string(),tier:z.string(),stars:z.number().int().nonnegative().nullable(),
 maxStars:z.number().int().positive(),nextAction:z.enum(["UNKNOWN","STAR","PRESTIGE","MAXED"]),
 starsUntilNext:z.number().int().nonnegative().nullable(),nextTier:z.string().nullable(),
 prestigeStarRequirement:z.number().int().positive().nullable(),prestigeStarMet:z.boolean(),
 currentRequirements:crimsonArmorRequirementsSchema,nextTierRequirements:crimsonArmorRequirementsSchema.nullable(),
 upgradeCostKnown:z.boolean(),nextUpgrade:crimsonUpgradeStepSchema.nullable(),
 toNextUpgrade:crimsonCostSummarySchema.nullable(),toInfernal15:crimsonCostSummarySchema.nullable(),
 }))});
const crimsonProgressSchema=z.object({
 available:z.boolean(),
 faction:z.object({
  selected:z.string().nullable(),currentReputation:z.number().nullable(),
  reputation:z.object({mages:z.number().nullable(),barbarians:z.number().nullable(),magesHighest:z.number().nullable()}),
  factions:z.array(z.object({id:z.string(),reputation:z.number().nullable(),rank:z.string().nullable()})),
 }),
 dojo:z.object({available:z.boolean(),totalPoints:z.number().nullable(),eligibleBelt:z.string().nullable(),
  nextBelt:z.string().nullable(),pointsToNext:z.number().nullable(),
  tests:z.array(z.object({id:z.string(),name:z.string(),points:z.number().nullable(),time:z.number().nullable(),rank:z.string().nullable()}))}),
 kuudra:z.object({available:z.boolean(),totalCompletions:z.number().nullable(),collectionPoints:z.number().nullable(),
  tiers:z.array(z.object({id:z.string(),name:z.string(),reputation:z.number(),points:z.number(),
   completions:z.number().nullable(),highestWave:z.number().nullable(),
   reputationMet:z.boolean().nullable(),previousCleared:z.boolean().nullable(),
   storyRequired:z.boolean(),storyVerified:z.boolean()}))}),
 trophyFishing:z.object({available:z.boolean(),totalCaught:z.number().nullable(),fishTypes:z.number(),
  claimedOdgerRank:z.string().nullable(),rewards:z.array(z.number()).nullable(),
  grades:z.array(z.object({quality:z.string(),unique:z.number()})),
  missingByQuality:z.array(z.object({quality:z.string(),missing:z.array(z.string()),observed:z.number().int().nonnegative()})),
  pityReference:z.object({gold:z.number(),diamond:z.number(),scope:z.literal("PER_FISH"),countsAvailable:z.boolean()}),
  fish:z.array(z.object({id:z.string(),name:z.string(),catchRequirement:z.string().nullable(),catchRequirementType:z.string().nullable(),bronze:z.number().nullable(),silver:z.number().nullable(),
   gold:z.number().nullable(),diamond:z.number().nullable(),highestQuality:z.string().nullable(),total:z.number().nullable()}))}),
 matriarch:z.object({available:z.boolean(),pearlsCollected:z.number().nullable(),lastAttempt:z.number().nullable(),
  recentRefreshes:z.array(z.number()).nullable()}),
 equipment:crimsonEquipmentSchema,
 questDataAvailable:z.boolean(),
 quests:crimsonQuestSchema,
 unlocks:z.object({
  factionRanks:z.array(z.object({faction:z.string(),rank:z.string().nullable(),
   thresholds:z.array(z.object({name:z.string(),required:z.number(),
    status:z.enum(["MET","NOT_MET","UNKNOWN"])}))})),
  kuudraTiers:z.array(z.object({id:z.string(),name:z.string(),historicalAccess:z.boolean(),
   reputation:z.enum(["MET","NOT_MET","UNKNOWN"]),
   previousTier:z.enum(["MET","NOT_MET","UNKNOWN","NOT_APPLICABLE"]),
   storyline:z.enum(["MET","NOT_MET","UNKNOWN"]),
   overall:z.enum(["HISTORICALLY_CLEARED","KNOWN_GATE_UNMET","NOT_VERIFIED"])})),
 }),
});
export const normalizedProfileSchema = z.object({
  identity: profilesResponseSchema.shape.identity,
  profile: profileSummarySchema.extend({ availableProfiles: z.array(profileSummarySchema) }),
  profileCreatedAt: z.number().nullable(),
  economy: z.object({ purse: z.number().nullable(), bank: z.number().nullable(), personalBank: z.number().nullable() }),
  gear: z.object({ armor: gearSection, equipment: gearSection, weapons: z.array(profileItemSchema), equippedWeapon: profileItemSchema.nullable(),
    loadouts: z.object({ names: z.record(z.string(), z.string()), ids: z.array(z.string()),
      armor: z.object({ equippedSet: z.number().nullable(), sets: z.record(z.string(), z.record(z.string(), profileItemSchema)) }),
      equipment: z.object({ equippedSet: z.number().nullable(), sets: z.record(z.string(), z.record(z.string(), profileItemSchema)) }) }) }),
  inventoryItems: z.array(profileItemSchema),
  accessories: accessorySchema,
  pets: z.object({ owned: z.array(petSchema), activePet: petSchema.nullable() }),
  progression: z.object({ skills: z.record(z.string(), levelSchema), slayers: z.record(z.string(), slayerSchema), dungeons: dungeonSchema,
    mining: miningProgressionSchema, foraging: foragingProgressionSchema, fishing: fishingProgressionSchema,
    enchanting: ownedEnchantingStateSchema }),
  attributes: statsSchema,
  shards: z.object({ owned: z.unknown().nullable(), fused: z.unknown().nullable(), traps: z.unknown().nullable() }),
  collections: statsSchema, unlockedCollectionTiers: z.array(z.string()), craftedGenerators: z.array(z.string()),
  collectionsProgress:collectionsTabSchema,
  crimsonIsle:crimsonProgressSchema,
  minions: minionProgressSchema,
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
