import { z } from "zod";

export const petMechanicParseStatusSchema = z.enum(["FULL", "PARTIAL", "UNPARSED"]);
export const petEffectKindSchema = z.enum([
  "FLAT_STAT", "SCALED_STAT", "STAT_MULTIPLIER", "CONVERSION", "RESOURCE_MULTIPLIER",
  "DROP_CHANCE", "DROP_MULTIPLIER", "XP_MULTIPLIER", "EQUIPMENT_MODIFIER",
  "MINION_MODIFIER", "ABILITY_MODIFIER", "MECHANIC", "UTILITY",
]);
export const petConditionKindSchema = z.enum([
  "LOCATION", "ACTIVITY", "RESOURCE", "BLOCK_TYPE", "MOB_TYPE", "EQUIPMENT_TYPE",
  "SPECIFIC_ITEM", "HEALTH_THRESHOLD", "TIME_EVENT", "COLLECTION", "SKILL_LEVEL",
  "BESTIARY", "OWNED_PETS", "RUN_STATE",
]);

export const petEffectSchema = z.object({
  kind: petEffectKindSchema,
  target: z.string().nullable(),
  valueTemplate: z.string().nullable(),
  rawText: z.string(),
});
export const petConditionSchema = z.object({
  kind: petConditionKindSchema,
  value: z.string(),
  rawText: z.string(),
});
export const petAbilityMechanicSchema = z.object({
  name: z.string(),
  rawLore: z.array(z.string()),
  effects: z.array(petEffectSchema),
  conditions: z.array(petConditionSchema),
  parseStatus: petMechanicParseStatusSchema,
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
});
export const petUpgradePathSchema = z.object({
  operation: z.literal("KAT"),
  inputId: z.string(),
  outputId: z.string(),
  coins: z.number().nonnegative().nullable(),
  timeSeconds: z.number().nonnegative().nullable(),
  itemCosts: z.array(z.object({ itemId: z.string(), count: z.number().positive() })),
});
export const canonicalPetDefinitionSchema = z.object({
  id: z.string(),
  type: z.string(),
  rarity: z.string(),
  petSkillType: z.string().nullable(),
  maxLevel: z.number().int().positive(),
  rarityOffset: z.number().int().nonnegative().nullable(),
  xpCurve: z.array(z.number().nonnegative()),
  xpMultiplier: z.number().positive(),
  customLevelingType: z.number().nullable(),
  baseStatTemplates: z.record(z.string(), z.string()),
  abilities: z.array(petAbilityMechanicSchema),
  upgradePaths: z.array(petUpgradePathSchema),
  source: z.literal("NEU"),
});
export const canonicalPetItemDefinitionSchema = z.object({
  itemId: z.string(),
  effects: z.array(petEffectSchema),
  conditions: z.array(petConditionSchema),
  rawLore: z.array(z.string()),
  parseStatus: petMechanicParseStatusSchema,
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  source: z.literal("NEU"),
});

export type PetEffect = z.infer<typeof petEffectSchema>;
export type PetCondition = z.infer<typeof petConditionSchema>;
export type PetAbilityMechanic = z.infer<typeof petAbilityMechanicSchema>;
export type CanonicalPetDefinition = z.infer<typeof canonicalPetDefinitionSchema>;
export type CanonicalPetItemDefinition = z.infer<typeof canonicalPetItemDefinitionSchema>;
