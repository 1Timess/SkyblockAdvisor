import { advisorRouteSchema, type AdvisorConversationState, type AdvisorGoal, type AdvisorRole, type AdvisorRoute, type AnalysisDomain, type AnalysisScope } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

const roleScopes: Record<AdvisorRole, AnalysisScope> = {
  mage: "MAGE", archer: "ARCHER", berserk: "BERSERK", tank: "SURVIVABILITY", healer: "SURVIVABILITY",
};
const domainsByScope: Record<AnalysisScope, AnalysisDomain[]> = {
  GEAR: ["ARMOR", "WEAPONS"], ARMOR: ["ARMOR"], WEAPONS: ["WEAPONS"], ACCESSORIES: ["ACCESSORIES"], PETS: ["PETS"],
  SURVIVABILITY: ["ARMOR"], DAMAGE: ["ARMOR", "WEAPONS"], MAGE: ["ARMOR", "WEAPONS"], ARCHER: ["ARMOR", "WEAPONS"],
  BERSERK: ["ARMOR", "WEAPONS"], GENERAL: ["ARMOR", "WEAPONS"], CLARIFY: [],
};

export function routeAdvisorQuestion(input: { question: string; profile: Pick<NormalizedSkyBlockProfile, "progression">; conversationState?: AdvisorConversationState }): AdvisorRoute {
  const text = input.question.toLowerCase(), armorSlots: AdvisorRoute["armorSlots"] = [];
  if (/\bhelmet\b/.test(text)) armorSlots.push("helmet");
  if (/\bchestplate\b|\bchest plate\b/.test(text)) armorSlots.push("chestplate");
  if (/\bleggings\b/.test(text)) armorSlots.push("leggings");
  if (/\bboots\b/.test(text)) armorSlots.push("boots");
  const explicitGoal = detectExplicitGoal(text);
  const explicitRole = detectExplicitRole(text);
  const profileRole = normalizeRole(input.profile.progression.dungeons.selectedClass);
  const inferredRole = explicitRole ?? input.conversationState?.role ?? profileRole;
  const goal = explicitGoal ?? input.conversationState?.goal ?? goalFromExplicitScope(text) ?? "GENERAL_UPGRADE";

  let scope: AnalysisScope, reason: string;
  if (/\bmagical power\b|\bmp\b|\baccessor(?:y|ies)\b|\btalismans?\b/.test(text)) [scope, reason] = ["ACCESSORIES", "The question explicitly asks about accessories or Magical Power."];
  else if (/\bpets?\b/.test(text)) [scope, reason] = ["PETS", "The question explicitly asks about pets."];
  else if (goal === "INTELLIGENCE") [scope, reason] = ["MAGE", "The explicit current goal is Intelligence."];
  else if (goal === "SPEED") [scope, reason] = ["GEAR", "The explicit current goal is Speed."];
  else if (/\bmage\b|\bability damage\b/.test(text)) [scope, reason] = ["MAGE", "The question specifies a mage or ability-damage scope."];
  else if (/\barcher\b|\bshortbow\b|\bbow\b/.test(text)) [scope, reason] = ["ARCHER", "The question specifies an archer or bow scope."];
  else if (/\bberserk\b|\bmelee\b/.test(text)) [scope, reason] = ["BERSERK", "The question specifies a Berserk or melee scope."];
  else if (["SURVIVABILITY", "HEALTH", "DEFENSE"].includes(goal)) [scope, reason] = ["SURVIVABILITY", "The explicit current goal is survivability."];
  else if (["DAMAGE", "STRENGTH", "CRIT_DAMAGE", "ATTACK_SPEED"].includes(goal)) [scope, reason] = ["DAMAGE", "The explicit current goal is combat damage."];
  else if (armorSlots.length || /\barmor\b/.test(text)) [scope, reason] = ["ARMOR", "The question explicitly asks about armor."];
  else if (/\bweapons?\b|\bsword\b|\bwand\b/.test(text)) [scope, reason] = ["WEAPONS", "The question explicitly asks about weapons."];
  else if (/\bf\d+\b|\bfloor\b|\bcatacombs?\b|\bdungeons?\b/.test(text)) [scope, reason] = ["GEAR", "The question ties a broad upgrade request to dungeon progression."];
  else if (input.conversationState?.goal) [scope, reason] = [scopeForGoal(input.conversationState.goal), "The saved conversation goal narrows the broad question."];
  else if (input.conversationState?.role) [scope, reason] = [roleScopes[input.conversationState.role], "The saved conversation role narrows the broad question."];
  else if (input.conversationState?.activeScopes?.length) [scope, reason] = [input.conversationState.activeScopes[0], "The saved conversation scope narrows the broad question."];
  else if (/\boverall\b|\bgeneral\b|\baccount progression\b/.test(text)) [scope, reason] = ["GENERAL", "The question explicitly requests general account progression."];
  else if (inferredRole) [scope, reason] = [roleScopes[inferredRole], "The selected Dungeon class narrows the broad question."];
  else [scope, reason] = ["CLARIFY", "The broad question does not identify a combat role, content goal, or item domain."];
  return advisorRouteSchema.parse({ scope, goal, inferredRole: inferredRole ?? null, activeDomains: domainsByScope[scope], clarificationRecommended: scope === "CLARIFY", reason, armorSlots });
}

function detectExplicitGoal(text: string): AdvisorGoal | null {
  if (/\bmagical power\b|\bmp\b/.test(text)) return "MAGICAL_POWER";
  if (/\bintelligence\b|\bmana\b/.test(text)) return "INTELLIGENCE";
  if (/\battack speed\b/.test(text)) return "ATTACK_SPEED";
  if (/\bcrit(?:ical)? damage\b/.test(text)) return "CRIT_DAMAGE";
  if (/\bstrength\b/.test(text)) return "STRENGTH";
  if (/\bspeed\b|\bfaster\b/.test(text)) return "SPEED";
  if (/\bhealth\b/.test(text)) return "HEALTH";
  if (/\bdefen[cs]e\b/.test(text)) return "DEFENSE";
  if (/\bsurviv(?:e|ability)\b|\bdying\b|\btanky\b|\btankier\b/.test(text)) return "SURVIVABILITY";
  if (/\bdamage\b|\bdps\b|\bstronger\b/.test(text)) return "DAMAGE";
  return null;
}

function goalFromExplicitScope(text: string): AdvisorGoal | null {
  if (/\baccessor(?:y|ies)\b|\btalismans?\b/.test(text)) return "MAGICAL_POWER";
  if (/\bpets?\b/.test(text)) return "PET";
  if (/\barmor\b|\bhelmet\b|\bchestplate\b|\bchest plate\b|\bleggings\b|\bboots\b/.test(text)) return "ARMOR";
  if (/\bweapons?\b|\bsword\b|\bwand\b|\bbow\b|\bshortbow\b/.test(text)) return "WEAPON";
  return null;
}

function detectExplicitRole(text: string): AdvisorRole | null {
  if (/\bmage\b/.test(text)) return "mage";
  if (/\barcher\b/.test(text)) return "archer";
  if (/\bberserk\b|\bmelee\b/.test(text)) return "berserk";
  if (/\btank\b/.test(text)) return "tank";
  if (/\bhealer\b/.test(text)) return "healer";
  return null;
}

function normalizeRole(value: string | null): AdvisorRole | null {
  return value !== null && Object.hasOwn(roleScopes, value) ? value as AdvisorRole : null;
}

function scopeForGoal(goal: AdvisorGoal): AnalysisScope {
  if (goal === "MAGICAL_POWER") return "ACCESSORIES";
  if (goal === "PET") return "PETS";
  if (goal === "ARMOR") return "ARMOR";
  if (goal === "WEAPON") return "WEAPONS";
  if (goal === "INTELLIGENCE") return "MAGE";
  if (["SURVIVABILITY", "HEALTH", "DEFENSE"].includes(goal)) return "SURVIVABILITY";
  if (["DAMAGE", "STRENGTH", "CRIT_DAMAGE", "ATTACK_SPEED"].includes(goal)) return "DAMAGE";
  return "GEAR";
}
