import { z } from "zod";

export const skillMilestoneSchema = z.object({
  skill: z.literal("enchanting"),
  level: z.number().int().min(1).max(60),
  kind: z.enum(["ENCHANT_ACCESS", "ACTIVITY_ACCESS"]),
  name: z.string().min(1),
  source: z.literal("USER_CONFIRMED_WIKI_REWARDS"),
});

export const experimentationFactSchema = z.object({
  status: z.enum(["KNOWN", "PARTIAL", "UNKNOWN"]),
  value: z.string().nullable(),
  source: z.string().nullable(),
}).superRefine((fact, context) => {
  if (fact.status === "KNOWN" && (fact.value === null || fact.source === null))
    context.addIssue({ code: "custom", message: "Known facts require a value and source" });
  if (fact.status === "UNKNOWN" && fact.value !== null)
    context.addIssue({ code: "custom", message: "Unknown facts cannot assert a value" });
});

export const experimentTierSchema = z.object({
  experiment: z.enum(["CHRONOMATRON", "ULTRASEQUENCER", "SUPERPAIRS"]),
  stake: z.enum(["BEGINNER", "HIGH", "GRAND", "SUPREME", "TRANSCENDENT", "METAPHYSICAL"]),
  requiredEnchantingLevel: z.number().int().min(10).max(60).nullable(),
  evidence: z.enum(["COMMUNITY_WIKI_RESEARCH", "CORROBORATED_RESEARCH", "CONFLICTING_SOURCE"]),
  source: z.url(),
  note: z.string().nullable(),
}).superRefine((tier, context) => {
  if (tier.evidence !== "CONFLICTING_SOURCE" && tier.requiredEnchantingLevel === null)
    context.addIssue({ code: "custom", message: "A researched threshold requires a level" });
  if (tier.evidence === "CONFLICTING_SOURCE" && (tier.requiredEnchantingLevel !== null || !tier.note))
    context.addIssue({ code: "custom", message: "A conflicting threshold requires a null level and explanation" });
});

export const experimentationMechanicsSchema = z.object({
  accessLevel: z.number().int().min(1).max(60),
  tiers: z.array(experimentTierSchema),
  dailyCharges: experimentationFactSchema,
  resets: experimentationFactSchema,
  rngMeter: experimentationFactSchema,
});

export type SkillMilestone = z.infer<typeof skillMilestoneSchema>;
export type ExperimentationMechanics = z.infer<typeof experimentationMechanicsSchema>;
export type ExperimentTier = z.infer<typeof experimentTierSchema>;

export const possibleExperimentRewardSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["ENCHANTED_BOOK", "ENDCAP_UPGRADE", "PET", "CONSUMABLE", "DYE", "COSMETIC"]),
  pool: z.enum(["RARE", "ULTRA_RARE", "OTHER"]),
  // Null means the exact minimum stake has not been established by the cited source.
  minimumStake: z.enum(["BEGINNER", "HIGH", "GRAND", "SUPREME", "TRANSCENDENT", "METAPHYSICAL"]).nullable(),
  source: z.url(),
  minimumStakeSource: z.url().nullable(),
}).superRefine((reward, context) => {
  if ((reward.minimumStake === null) !== (reward.minimumStakeSource === null))
    context.addIssue({ code: "custom", message: "A minimum stake requires its own source" });
});

export type PossibleExperimentReward = z.infer<typeof possibleExperimentRewardSchema>;
