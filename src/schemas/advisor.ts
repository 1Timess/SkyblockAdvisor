import { z } from "zod";
import { raritySchema, statsSchema } from "./items";
import { marketConfidenceSchema } from "./market";

export const analysisScopeSchema = z.enum(["GEAR", "ARMOR", "WEAPONS", "ACCESSORIES", "PETS", "SURVIVABILITY", "DAMAGE", "MAGE", "ARCHER", "BERSERK", "GENERAL", "CLARIFY"]);
export type AnalysisScope = z.infer<typeof analysisScopeSchema>;
export const analysisDomainSchema = z.enum(["ARMOR", "WEAPONS", "ACCESSORIES", "PETS"]);
export type AnalysisDomain = z.infer<typeof analysisDomainSchema>;
export const advisorRoleSchema = z.enum(["mage", "archer", "berserk", "tank", "healer"]);

export const advisorConversationStateSchema = z.object({
  role: advisorRoleSchema.optional(), goal: z.string().trim().min(1).optional(),
  activeScopes: z.array(analysisScopeSchema).optional(), budgetCoins: z.number().nonnegative().optional(),
});
export type AdvisorConversationState = z.infer<typeof advisorConversationStateSchema>;
export const advisorRouteSchema = z.object({
  scope: analysisScopeSchema, activeDomains: z.array(analysisDomainSchema), clarificationRecommended: z.boolean(),
  reason: z.string(), armorSlots: z.array(z.enum(["helmet", "chestplate", "leggings", "boots"])),
});
export type AdvisorRoute = z.infer<typeof advisorRouteSchema>;

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
export const availableAnalysisSchema = z.object({
  armor: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
  weapons: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative() }),
  accessories: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative(), currentMagicalPower: z.number().nonnegative(), missingCount: z.number().int().nonnegative(), upgradeCount: z.number().int().nonnegative() }),
  pets: z.object({ available: z.boolean(), candidateCount: z.number().int().nonnegative(), ownedCount: z.number().int().nonnegative() }),
});
export type AvailableAnalysis = z.infer<typeof availableAnalysisSchema>;

export const advisorContextSchema = z.object({
  question: z.string().trim().min(1).max(1000), route: advisorRouteSchema,
  conversationState: advisorConversationStateSchema.nullable(), availableAnalysis: availableAnalysisSchema,
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
  candidates: z.array(compactAdvisorCandidateSchema).max(32), warnings: z.array(z.string()),
});
export type AdvisorContext = z.infer<typeof advisorContextSchema>;

const followUpSchema = z.object({ domain: analysisDomainSchema, label: z.string().min(1), reason: z.string().min(1) });
const actionSchema = z.object({
  rank: z.number().int().positive(), actionType: z.enum(["BUY", "PROGRESSION", "HOLD", "INVESTIGATE"]),
  candidateId: z.string().nullable(), action: z.string().min(1), why: z.string().min(1), tradeoffs: z.array(z.string()),
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
