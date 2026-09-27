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

export const experimentationMechanicsSchema = z.object({
  accessLevel: z.number().int().min(1).max(60),
  tiers: experimentationFactSchema,
  dailyCharges: experimentationFactSchema,
  resets: experimentationFactSchema,
  rngMeter: experimentationFactSchema,
});

export type SkillMilestone = z.infer<typeof skillMilestoneSchema>;
export type ExperimentationMechanics = z.infer<typeof experimentationMechanicsSchema>;
