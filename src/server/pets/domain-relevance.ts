import type { CanonicalPetDefinition, CanonicalPetItemDefinition, PetAbilityMechanic, PetCondition, PetEffect } from "../../schemas/pet-mechanics";
import { petDomainRelevanceSchema, type PetDomainEvidence, type PetDomainRelevance, type PetProgressionDomain } from "../../schemas/pet-domain-relevance";

const TARGET_DOMAINS: Record<string, readonly PetProgressionDomain[]> = {
  MINING_SPEED: ["MINING"], MINING_FORTUNE: ["MINING"], GEMSTONE_FORTUNE: ["MINING"], PRISTINE: ["MINING"],
  BLOCK_FORTUNE: ["MINING", "FORAGING"], HEAT_RESISTANCE: ["MINING"],
  FARMING_FORTUNE: ["FARMING"], FORAGING_FORTUNE: ["FORAGING"],
};

const TEXT_DOMAINS: readonly [RegExp, PetProgressionDomain][] = [
  [/\b(?:mining|mineshaft|mithril|titanium|gemstone|glacite|dwarven|crystal hollows|magma fields|hotm|powder)\b/i, "MINING"],
  [/\b(?:farming|crop|garden)\b/i, "FARMING"],
  [/\b(?:foraging|wood|log|tree)\b/i, "FORAGING"],
  [/\b(?:combat|damage|strength|crit|ferocity|attack speed|mob)\b/i, "COMBAT"],
  [/\b(?:fishing|sea creature)\b/i, "FISHING"],
  [/\b(?:enchanting|enchantment)\b/i, "ENCHANTING"],
  [/\b(?:alchemy|potion)\b/i, "ALCHEMY"],
  [/\b(?:taming|pet exp|pet experience)\b/i, "TAMING"],
];

export function evaluatePetDomainRelevance(
  pet: CanonicalPetDefinition,
  domain: PetProgressionDomain,
  petItem?: CanonicalPetItemDefinition | null,
): PetDomainRelevance {
  const evidence: PetDomainEvidence[] = [];
  const unresolvedMechanics: string[] = [];

  for (const ability of pet.abilities) {
    collectMechanicEvidence(ability, domain, "PET_EFFECT", "PET_CONDITION", evidence);
    if (ability.parseStatus !== "FULL") unresolvedMechanics.push(...ability.rawLore);
  }
  if (petItem) {
    collectEffects(petItem.effects, domain, "PET_ITEM_EFFECT", evidence);
    collectConditions(petItem.conditions, domain, "PET_ITEM_CONDITION", evidence);
    if (petItem.parseStatus !== "FULL") unresolvedMechanics.push(...petItem.rawLore);
  }

  // Skill type is supporting evidence only. A pet earning Mining XP does not by itself prove a Mining mechanic.
  if (normalizeDomain(pet.petSkillType) === domain) {
    evidence.push({ source: "PET_SKILL_TYPE", domain, mechanic: pet.petSkillType!, rawText: null });
  }

  // Conditions scope mechanics; they do not establish the benefit's domain on their own.
  // Example: Fishing Speed in Crystal Hollows is still a Fishing mechanic, not a Mining mechanic.
  const semantic = evidence.some(value => value.source === "PET_EFFECT" || value.source === "PET_ITEM_EFFECT");
  const relevant = semantic;
  const confidence = !relevant ? (unresolvedMechanics.length ? "LOW" : "MEDIUM")
    : unresolvedMechanics.length ? "MEDIUM" : "HIGH";
  return petDomainRelevanceSchema.parse({ domain, relevant, confidence, evidence, unresolvedMechanics: [...new Set(unresolvedMechanics)] });
}

function collectMechanicEvidence(
  mechanic: PetAbilityMechanic, domain: PetProgressionDomain,
  effectSource: "PET_EFFECT", conditionSource: "PET_CONDITION", out: PetDomainEvidence[],
) {
  collectEffects(mechanic.effects, domain, effectSource, out);
  collectConditions(mechanic.conditions, domain, conditionSource, out);
}

function collectEffects(effects: readonly PetEffect[], domain: PetProgressionDomain, source: "PET_EFFECT" | "PET_ITEM_EFFECT", out: PetDomainEvidence[]) {
  for (const effect of effects) {
    const domains = new Set<PetProgressionDomain>(TARGET_DOMAINS[effect.target ?? ""] ?? []);
    for (const [pattern, candidate] of TEXT_DOMAINS) if (pattern.test(effect.rawText)) domains.add(candidate);
    if (domains.has(domain)) out.push({ source, domain, mechanic: effect.target ?? effect.kind, rawText: effect.rawText });
  }
}

function collectConditions(conditions: readonly PetCondition[], domain: PetProgressionDomain, source: "PET_CONDITION" | "PET_ITEM_CONDITION", out: PetDomainEvidence[]) {
  for (const condition of conditions) {
    const text = `${condition.value} ${condition.rawText}`;
    if (TEXT_DOMAINS.some(([pattern, candidate]) => candidate === domain && pattern.test(text))) {
      out.push({ source, domain, mechanic: `${condition.kind}:${condition.value}`, rawText: condition.rawText });
    }
  }
}

function normalizeDomain(value: string | null): PetProgressionDomain | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  return ["MINING","FARMING","FORAGING","COMBAT","FISHING","ENCHANTING","ALCHEMY","TAMING"].includes(upper)
    ? upper as PetProgressionDomain : null;
}
