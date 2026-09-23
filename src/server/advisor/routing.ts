import { advisorRouteSchema, type AdvisorConversationState, type AdvisorRoute, type AnalysisDomain, type AnalysisScope } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

const roleScopes: Record<NonNullable<AdvisorConversationState["role"]>, AnalysisScope> = {
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
  let scope: AnalysisScope, reason: string;
  if (/\bmagical power\b|\bmp\b|\baccessor(?:y|ies)\b|\btalismans?\b/.test(text)) [scope, reason] = ["ACCESSORIES", "The question explicitly asks about accessories or Magical Power."];
  else if (/\bpets?\b/.test(text)) [scope, reason] = ["PETS", "The question explicitly asks about pets."];
  else if (/\bmage\b|\bintelligence\b|\bability damage\b/.test(text)) [scope, reason] = ["MAGE", "The question specifies a mage or ability-damage goal."];
  else if (/\barcher\b|\bshortbow\b|\bbow\b/.test(text)) [scope, reason] = ["ARCHER", "The question specifies an archer or bow goal."];
  else if (/\bberserk\b|\bmelee\b/.test(text)) [scope, reason] = ["BERSERK", "The question specifies a Berserk or melee goal."];
  else if (/\bsurviv(?:e|ability)\b|\bdying\b|\btanky\b|\btankier\b|\bhealth\b|\bdefen[cs]e\b/.test(text)) [scope, reason] = ["SURVIVABILITY", "The question asks for survivability."];
  else if (/\bdamage\b|\bdps\b|\bstronger\b|\bmore damage\b/.test(text)) [scope, reason] = ["DAMAGE", "The question asks for damage."];
  else if (armorSlots.length || /\barmor\b/.test(text)) [scope, reason] = ["ARMOR", "The question explicitly asks about armor."];
  else if (/\bweapons?\b|\bsword\b|\bwand\b/.test(text)) [scope, reason] = ["WEAPONS", "The question explicitly asks about weapons."];
  else if (/\bf\d+\b|\bfloor\b|\bcatacombs?\b|\bdungeons?\b/.test(text)) [scope, reason] = ["GEAR", "The question ties a broad upgrade request to dungeon progression."];
  else if (input.conversationState?.role) [scope, reason] = [roleScopes[input.conversationState.role], "The saved conversation role narrows the broad question."];
  else if (input.conversationState?.activeScopes?.length) [scope, reason] = [input.conversationState.activeScopes[0], "The saved conversation scope narrows the broad question."];
  else if (/\boverall\b|\bgeneral\b|\baccount progression\b/.test(text)) [scope, reason] = ["GENERAL", "The question explicitly requests general account progression."];
  else if (isSupportedCombatRole(input.profile.progression.dungeons.selectedClass)) {
    scope = roleScopes[input.profile.progression.dungeons.selectedClass];
    reason = "The selected Dungeon class narrows the broad question.";
  }
  else [scope, reason] = ["CLARIFY", "The broad question does not identify a combat role, content goal, or item domain."];
  return advisorRouteSchema.parse({ scope, activeDomains: domainsByScope[scope], clarificationRecommended: scope === "CLARIFY", reason, armorSlots });
}

function isSupportedCombatRole(value: string | null): value is keyof typeof roleScopes {
  return value !== null && Object.hasOwn(roleScopes, value);
}
