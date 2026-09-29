import { z } from "zod";
import { gemstoneStateSchema, raritySchema, statsSchema } from "./items";
import { marketConfidenceSchema } from "./market";
import { experimentObservationSchema } from "./owned-enchanting";

export const analysisScopeSchema = z.enum(["GEAR", "ARMOR", "WEAPONS", "ACCESSORIES", "PETS", "FISHING", "MINING", "ENCHANTING", "COLLECTIONS", "SLAYER", "FARMING", "SURVIVABILITY", "DAMAGE", "MAGE", "ARCHER", "BERSERK", "GENERAL", "CLARIFY"]);
export type AnalysisScope = z.infer<typeof analysisScopeSchema>;
export const analysisDomainSchema = z.enum(["ARMOR", "WEAPONS", "ACCESSORIES", "PETS", "FISHING", "MINING", "ENCHANTING", "COLLECTIONS", "SLAYER", "FARMING", "DUNGEONS"]);
export type AnalysisDomain = z.infer<typeof analysisDomainSchema>;
export const profileIntelligenceDomainSchema = z.enum(["DUNGEONS", "ACCESSORIES", "FISHING", "MINING", "ENCHANTING", "COLLECTIONS", "SLAYER", "FARMING"]);
export type ProfileIntelligenceDomain = z.infer<typeof profileIntelligenceDomainSchema>;
export const advisorRoleSchema = z.enum(["mage", "archer", "berserk", "tank", "healer"]);
export type AdvisorRole = z.infer<typeof advisorRoleSchema>;
export const advisorGoalSchema = z.enum(["GENERAL_UPGRADE", "DAMAGE", "SURVIVABILITY", "HEALTH", "DEFENSE", "STRENGTH", "CRIT_DAMAGE", "ATTACK_SPEED", "INTELLIGENCE", "SPEED", "MAGICAL_POWER", "PET", "ARMOR", "WEAPON", "FISHING", "MINING", "ENCHANTING", "COLLECTIONS", "SLAYER", "FARMING", "FORAGING"]);
export type AdvisorGoal = z.infer<typeof advisorGoalSchema>;

export const advisorConversationStateSchema = z.object({
  role: advisorRoleSchema.optional(), goal: advisorGoalSchema.optional(),
  activeScopes: z.array(analysisScopeSchema).optional(), budgetCoins: z.number().nonnegative().optional(),
  profileSnapshotId: z.string().optional(), previousDomain: profileIntelligenceDomainSchema.optional(),
  currentDomain: profileIntelligenceDomainSchema.optional(), previousGoal: advisorGoalSchema.optional(),
});
export type AdvisorConversationState = z.infer<typeof advisorConversationStateSchema>;
export const advisorRouteSchema = z.object({
  scope: analysisScopeSchema, activeDomains: z.array(analysisDomainSchema), clarificationRecommended: z.boolean(),
  reason: z.string(), goal: advisorGoalSchema, inferredRole: advisorRoleSchema.nullable(),
  armorSlots: z.array(z.enum(["helmet", "chestplate", "leggings", "boots"])), domain: profileIntelligenceDomainSchema.nullable(),
  mechanics: z.array(z.string()),
});
export type AdvisorRoute = z.infer<typeof advisorRouteSchema>;

const compactItemSchema = z.object({
  id: z.string().nullable(), name: z.string(), rarity: raritySchema.nullable(), categories: z.array(z.string()), stats: statsSchema,
  abilityText: z.array(z.string()), setBonusText: z.array(z.string()), gemstones: gemstoneStateSchema.optional(),
});
export const compactAdvisorCandidateMemberSchema = z.object({
  id: z.string(), name: z.string(),
  price: z.object({ coins: z.number().int().nonnegative(), observedAt: z.string().datetime(), confidence: marketConfidenceSchema }).nullable(),
  knownChanges: z.record(z.string(), z.object({ current: z.number().nullable(), candidate: z.number().nullable() })),
  requirements: z.array(z.string()), warnings: z.array(z.string()),
});
export type CompactAdvisorCandidateMember = z.infer<typeof compactAdvisorCandidateMemberSchema>;

export const compactAdvisorCandidateSchema = z.object({
  id: z.string(), domain: z.enum(["armor", "weapon", "accessory", "pet", "tool"]), name: z.string(), rarity: raritySchema.nullable(),
  categories: z.array(z.string()), stats: statsSchema,
  price: z.object({ coins: z.number().int().nonnegative(), observedAt: z.string().datetime(), confidence: marketConfidenceSchema }).nullable(),
  knownChanges: z.record(z.string(), z.object({ current: z.number().nullable(), candidate: z.number().nullable() })),
  relevance: z.object({ reason: z.string(), relevantStats: z.array(z.string()) }),
  feasibility: z.object({
    priceStatus: z.enum(["WITHIN_BUDGET", "OVER_BUDGET", "UNKNOWN", "NO_BUDGET"]),
    budgetCoins: z.number().nonnegative().nullable(), priceCoins: z.number().nonnegative().nullable(), budgetDeltaCoins: z.number().nullable(),
    overBudgetPercent: z.number().nonnegative().nullable(),
    requirementStatus: z.enum(["MET", "NOT_MET", "UNKNOWN", "MIXED"]),
    requirements: z.array(z.object({
      text: z.string(), type: z.enum(["SKILL", "SLAYER", "DUNGEON_LEVEL", "DUNGEON_FLOOR", "HEART_OF_THE_MOUNTAIN", "GARDEN_LEVEL", "UNKNOWN"]),
      subject: z.string().nullable(), current: z.number().nonnegative().nullable(), required: z.number().nonnegative().nullable(),
      gap: z.number().nonnegative().nullable(), status: z.enum(["MET", "NOT_MET", "UNKNOWN"]),
    })),
  }),
  requirements: z.array(z.string()), abilityText: z.array(z.string()), setBonusText: z.array(z.string()), warnings: z.array(z.string()),
  petAcquisitionFamily: z.object({
    kind: z.literal("PET_ACQUISITION"), familyId: z.string(), petType: z.string(),
    members: z.array(z.object({
      id: z.string(), canonicalPetId: z.string(), rarity: z.string(),
      level: z.number().int().positive(), maxLevel: z.number().int().positive(),
    })).min(1),
  }).optional(),
  family: z.object({
    kind: z.string(), count: z.number().int().min(2), totalPriceCoins: z.number().nonnegative().nullable(),
    aggregateKnownChanges: z.record(z.string(), z.number()), members: z.array(compactAdvisorCandidateMemberSchema).min(2),
  }).optional(),
});
export type CompactAdvisorCandidate = z.infer<typeof compactAdvisorCandidateSchema>;
export const availableAnalysisSchema = z.object({
  armor: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
  weapons: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
  accessories: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative(), currentMagicalPower: z.number().nonnegative(), missingCount: z.number().int().nonnegative(), upgradeCount: z.number().int().nonnegative() }),
  pets: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative(), ownedCount: z.number().int().nonnegative() }),
  dungeons: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
  fishing: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
  mining: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
  enchanting: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
  collections: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
  slayer: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
  farming: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
});
export type AvailableAnalysis = z.infer<typeof availableAnalysisSchema>;

const compactLevelSchema = z.object({ level: z.number(), maxLevel: z.number() });
const compactPetSchema = z.object({ type: z.string(), name: z.string(), rarity: z.string(), level: z.number().nullable(),
  heldItem: z.string().nullable(), stats: statsSchema, abilityLore: z.array(z.string()) });
const compactAccessorySchema = compactItemSchema.extend({ active: z.boolean(), inactiveReason: z.string().nullable() });
const domainKnownStatsSchema = z.object({ totals: statsSchema, supportedStats: z.array(z.string()) });
const compactNodeSchema = z.object({ level: z.number().nullable(), value: z.number().nullable(), enabled: z.boolean().nullable(),
  state: z.record(z.string(), z.union([z.number(), z.boolean()])) });
const compactMiningCrystalSchema = z.object({ rawId: z.string(), state: z.string().nullable(), totalFound: z.number().nullable(), totalPlaced: z.number().nullable() });
const compactCrystalHollowsSchema = z.object({ available: z.boolean(), crystals: z.record(z.string(), compactMiningCrystalSchema),
  nucleus: z.object({ required: z.array(z.string()), acquired: z.array(z.string()), placed: z.array(z.string()),
    missing: z.array(z.string()), ready: z.boolean(), complete: z.boolean() }), biomes: z.record(z.string(), z.unknown()) });
export const advisorDomainContextSchema = z.discriminatedUnion("domain", [
  z.object({ domain: z.literal("FARMING"), farmingLevel: z.number().nullable(), farmingXp: z.number().nullable(),
    gardenAvailable: z.boolean(), gardenXp: z.number().nullable(), gardenLevel: z.number().nullable(),
    nextGardenLevel: z.object({ level: z.number(), xpRequired: z.number(), xpRemaining: z.number() }).nullable(),
    totalOffersAccepted: z.number().nullable(), uniqueVisitorsServed: z.number().nullable(),
    nextOffersMilestone: z.object({ tier: z.number(), threshold: z.number(), remaining: z.number() }).nullable(),
    nextUniqueVisitorsMilestone: z.object({ tier: z.number(), threshold: z.number(), remaining: z.number() }).nullable(),
    resourcesCollected: z.record(z.string(), z.number()), nextCropMilestones: z.array(z.object({ crop: z.string(), resourceId: z.string(),
      collected: z.number().nonnegative(), tier: z.number().int().positive(), threshold: z.number().positive(), remaining: z.number().positive() })).max(13),
    cropUpgradeLevels: z.record(z.string(), z.number()),
    unlockedPlotIds: z.array(z.string()).max(24), nextGardenCropUnlocks: z.array(z.string()),
    plotExpansionOptions: z.array(z.object({ group: z.string(), unlockedInGroup: z.number().int().nonnegative(),
      totalInGroup: z.number().int().positive(), gardenLevelRequired: z.number().int().positive(),
      cost: z.object({ item: z.enum(["COMPOST", "COMPOST_BUNDLE"]), amount: z.number().int().positive() }),
      mapping: z.literal("INFERRED_API_GROUP") })).max(4),
    greenhouseExpansionOptions: z.array(z.object({ greenhouseNumber: z.number().int().min(2).max(3),
      etherealVines: z.number().int().positive(), compostBundles: z.number().int().positive() })).max(2),
    cropPestOptions: z.array(z.object({ name: z.string(), crop: z.string(), gardenLevel: z.number().int().positive(),
      spray: z.string(), specialDrop: z.string() })).max(4),
    mutationOptions: z.array(z.object({ name: z.string(), gardenLevel: z.number().int().positive(), surface: z.string(),
      adjacent: z.array(z.object({ crop: z.string(), count: z.number().int().positive() })) })).max(8),
    nextPestUnlocks: z.array(z.object({ name: z.string(), crop: z.string(), gardenLevel: z.number().int().positive() })).max(3),
    contestCount: z.number().int().nonnegative(), medalInventory: z.record(z.string(), z.number()),
    observedPestKills: z.record(z.string(), z.number()), visibleEquipmentCount: z.number().int().nonnegative(),
    visibleEquipment: z.array(z.object({ id: z.string().nullable(), name: z.string(), source: z.string(),
      reforge: z.string().nullable(), enchantments: z.record(z.string(), z.number()), farmingFortune: z.number().nullable(),
      toolProgress: z.object({ rawLevel: z.number().nullable(), rawExperience: z.number().nullable(), farmingForDummiesCount: z.number().nullable() }).nullable(),
      levelingCrop: z.string().nullable(), nextToolLevel: z.object({ level: z.number().int().positive(),
        experienceRequired: z.number().positive(), experienceRemaining: z.number().positive(),
        interpretation: z.literal("INFERRED_WITHIN_LEVEL") }).nullable() })).max(16),
    inventoryApiLimited: z.boolean(),
    greenhouseEligibility: z.boolean().nullable(), greenhouseSlotObservation: z.object({
      status: z.enum(["REPORTED", "UNREPORTED"]), count: z.number().int().nonnegative().nullable(),
    }),
    activeOffers: z.array(z.object({ visitor: z.string(), status: z.string().nullable(), requirements: z.array(z.object({ itemId: z.string(), amount: z.number() })) })).max(8),
    activeOfferCount: z.number().int().nonnegative(), note: z.string() }),
  z.object({ domain: z.literal("SLAYER"), totalLevelUnlocks: z.number().int().nonnegative(), totalBossDrops: z.number().int().nonnegative(),
    possibleRngOptionCount: z.number().int().nonnegative(), focusFamilies: z.array(z.string()).max(6),
    families: z.array(z.object({ id: z.string(), bossName: z.string(), status: z.enum(["OBSERVED", "UNREPORTED"]),
      xp: z.number().nonnegative().nullable(), level: z.number().int().nonnegative().nullable(), nextLevel: z.number().int().positive().nullable(),
      xpToNext: z.number().nonnegative().nullable(), killsByTier: z.record(z.string(), z.number().nonnegative()),
      claimedRewardKeys: z.array(z.string()) })).max(6),
    unlockFocus: z.array(z.object({ family: z.string(), level: z.number().int().positive(), levelReached: z.boolean().nullable(), name: z.string(), itemId: z.string().nullable(),
      useRequirementLevel: z.number().int().nonnegative().nullable() })).max(16),
    dropFocus: z.array(z.object({ family: z.string(), neuId: z.string(), name: z.string(), conditionStatus: z.enum(["SOURCED", "UNRESOLVED"]),
      conditions: z.array(z.object({ bossTier: z.number().int().positive(), slayerLevel: z.number().int().nonnegative() })) })).max(8),
    craftedSlayerMinions: z.array(z.object({ id: z.string(), name: z.string(), tiers: z.array(z.number().int().positive()) })).max(4), note: z.string() }),
  z.object({ domain: z.literal("COLLECTIONS"), sourceVersion: z.string().nullable(), sourceUpdatedAt: z.number().nullable(),
    totalCollections: z.number().int().nonnegative(), craftedMinionTierCount: z.number().int().nonnegative(),
    craftedMinionTypes: z.number().int().nonnegative(), minionFocus: z.array(z.object({ id: z.string(), name: z.string(), tiers: z.array(z.number()) })).max(8),
    minionUpgradeCount: z.number().int().nonnegative(), minionUpgradeFocus: z.array(z.object({
      id: z.string(), name: z.string(), tiers: z.array(z.number()), nextCraftTier: z.number().int().positive(), nextCraftItemId: z.string(),
    })).max(8),
    minionRecipeCount: z.number().int().nonnegative(), minionRecipeFocus: z.array(z.object({
      name: z.string(), generatorId: z.string().nullable(), collectionId: z.string(), collectionName: z.string(), category: z.string(),
      requiredTier: z.number().int().positive(), requiredAmount: z.number().nonnegative(),
      collected: z.number().nullable(), remaining: z.number().nullable(),
      access: z.enum(["EXPLICIT_TIER", "COUNT_THRESHOLD", "BELOW_THRESHOLD", "UNKNOWN"]),
      history: z.enum(["OBSERVED", "NOT_OBSERVED", "CATALOG_UNKNOWN"]), observedCraftedTiers: z.array(z.number()),
      nextCraftTier: z.number().int().positive().nullable(), nextCraftItemId: z.string().nullable(),
    })).max(8),
    focus: z.array(z.object({ id: z.string(), name: z.string(), category: z.string(), collected: z.number().nullable(),
      unlockedTier: z.number().nullable(), countTier: z.number().nullable(), nextTier: z.object({ tier: z.number(), amount: z.number(), unlocks: z.array(z.string()) }).nullable(),
      remaining: z.number().nullable(), nextTierStatus: z.enum(["BELOW_THRESHOLD", "UNKNOWN", "MAXED"]),
      craftedMinionTiers: z.array(z.number()) })).max(8),
    note: z.string() }),
  z.object({ domain: z.literal("ENCHANTING"), enchantingLevel: z.number().nullable(), enchantingXp: z.number().nullable(),
    xpActivity: z.boolean(), matchedRewards: z.array(z.object({ name: z.string(), kind: z.string(), access: z.string(),
      requiredEnchantingLevel: z.number().nullable(), lowerEnchantedItems: z.array(z.string()).max(8),
      lowerEnchantedItemCount: z.number().int().nonnegative(), itemFit: z.string() })),
    possibleRewardCount: z.number().int().nonnegative(), experimentation: experimentObservationSchema, note: z.string() }),
  z.object({ domain: z.literal("DUNGEONS"), catacombsLevel: z.number().nullable(), selectedClass: z.string().nullable(),
    highestFloorNormal: z.number().nullable(), highestFloorMaster: z.number().nullable(), armor: z.array(compactItemSchema),
    weapons: z.array(compactItemSchema), equipment: z.array(compactItemSchema), activePet: compactPetSchema.nullable() }),
  z.object({ domain: z.literal("ACCESSORIES"), selectedPower: z.string().nullable(), magicalPower: z.number(), highestMagicalPower: z.number().nullable(),
    unlockedPowers: z.array(z.string()), bagUpgradesPurchased: z.number().nullable(),
    tuning: z.object({ highestUnlockedSlot: z.number().nullable(), slots: z.record(z.string(), statsSchema) }),
    owned: z.array(compactAccessorySchema), missing: z.array(z.object({ id: z.string(), name: z.string(), rarity: raritySchema.nullable() })),
    upgrades: z.array(z.object({ id: z.string(), name: z.string(), rarity: raritySchema.nullable() })) }),
  z.object({ domain: z.literal("FISHING"), fishingLevel: compactLevelSchema.nullable(), tools: z.array(compactItemSchema),
    itemsFished: statsSchema, seaCreatureKills: z.number().nullable(), trophyFish: statsSchema,
    armor: z.array(compactItemSchema), equipment: z.array(compactItemSchema), pets: z.array(compactPetSchema), knownStats: domainKnownStatsSchema,
    unavailableFacts: z.array(z.string()) }),
  z.object({ domain: z.literal("MINING"), miningLevel: compactLevelSchema.nullable(), hotmLevel: z.number().nullable(),
    treeExperience: z.number().nullable(), nodes: z.record(z.string(), compactNodeSchema), selectedAbility: z.string().nullable(),
    selectedAbilities: z.record(z.string(), z.string()), selectedTreeSlot: z.union([z.string(), z.number()]).nullable(),
    selectedTreeSlots: statsSchema, tokensSpent: z.number().nullable(), tokensSpentByTree: statsSchema,
    mithrilPowder: z.number().nullable(), gemstonePowder: z.number().nullable(), glacitePowder: z.number().nullable(),
    miningKnowledge: z.object({ stage: z.enum(["EARLY", "DWARVEN_MINES", "CRYSTAL_HOLLOWS", "GLACITE_TUNNELS"]),
      access: z.object({ crystalHollowsHotmRequirement: z.number(), crystalHollowsEligible: z.boolean(),
        glaciteTunnelsHotmRequirement: z.number(), glaciteTunnelsEligible: z.boolean() }),
      activity: z.object({ crystalHollows: z.boolean(), glaciteTunnels: z.boolean() }), relevantStats: z.array(z.string()), facts: z.array(z.string()) }),
    crystalHollows: compactCrystalHollowsSchema,
    glaciteTunnels: z.object({ available: z.boolean(), mineshaftsEntered: z.number().nullable(), corpsesLooted: statsSchema,
      totalCorpsesLooted: z.number().nullable(), fossilsDonated: z.array(z.string()), fossilDust: z.number().nullable(), coldResistance: z.number().nullable() }),
    crystals: z.record(z.string(), z.unknown()), biomes: z.record(z.string(), z.unknown()),
    tools: z.array(compactItemSchema),
    armor: z.array(compactItemSchema), equipment: z.array(compactItemSchema), pets: z.array(compactPetSchema), knownStats: domainKnownStatsSchema,
    unavailableFacts: z.array(z.string()) }),
]);
export type AdvisorDomainContext = z.infer<typeof advisorDomainContextSchema>;

export const advisorContextSchema = z.object({
  question: z.string().trim().min(1).max(1000), route: advisorRouteSchema,
  conversationState: advisorConversationStateSchema.nullable(), availableAnalysis: availableAnalysisSchema,
  canonical: z.object({
    identity: z.object({ username: z.string(), uuid: z.string() }),
    profile: z.object({ id: z.string(), cuteName: z.string(), selected: z.boolean(), gameMode: z.string().nullable(),
      snapshotId: z.string(), fetchedAt: z.string() }),
    economy: z.object({ purse: z.number().nullable(), bank: z.number().nullable(), personalBank: z.number().nullable() }),
    skills: z.record(z.string(), z.object({ level: z.number(), maxLevel: z.number() })),
    slayers: z.record(z.string(), z.object({ level: z.number().nullable(), xp: z.number().nullable() })),
    dungeons: z.object({ catacombsLevel: z.number().nullable(), selectedClass: z.string().nullable(), highestFloorNormal: z.number().nullable(), highestFloorMaster: z.number().nullable() }),
    magicalPower: z.number(),
  }),
  domainContext: advisorDomainContextSchema.nullable(),
  candidates: z.array(compactAdvisorCandidateSchema).max(32), warnings: z.array(z.string()),
});
export type AdvisorContext = z.infer<typeof advisorContextSchema>;

const followUpSchema = z.object({ domain: analysisDomainSchema, label: z.string().min(1), reason: z.string().min(1) });
const actionSchema = z.object({
  rank: z.number().int().positive(), actionType: z.enum(["BUY", "PROGRESSION", "HOLD", "INVESTIGATE"]),
  candidateId: z.string().nullable(), memberCandidateIds: z.array(z.string()), action: z.string().min(1), why: z.string().min(1), tradeoffs: z.array(z.string()),
  prerequisites: z.array(z.string()), uncertainty: z.string().nullable(),
});
const clarificationSchema = z.object({
  kind: z.literal("CLARIFICATION"), question: z.string().min(1), whyNeeded: z.string().nullable(),
  suggestedAnswers: z.array(z.string()), availableAnalysis: availableAnalysisSchema,
});
const planSchema = z.object({
  kind: z.literal("PLAN"), headline: z.string().min(1), actions: z.array(actionSchema).min(1).max(5),
  caveats: z.array(z.string()), followUps: z.array(followUpSchema),
});
export const advisorResponseSchema = z.discriminatedUnion("kind", [clarificationSchema, planSchema]);
export type AdvisorResponse = z.infer<typeof advisorResponseSchema>;
