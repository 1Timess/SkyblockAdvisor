import { advisorRouteSchema, type AdvisorConversationState, type AdvisorGoal, type AdvisorRole, type AdvisorRoute, type AnalysisDomain, type AnalysisScope, type ProfileIntelligenceDomain } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

const roleScopes: Record<AdvisorRole, AnalysisScope> = { mage: "MAGE", archer: "ARCHER", berserk: "BERSERK", tank: "SURVIVABILITY", healer: "SURVIVABILITY" };
const domainsByScope: Record<AnalysisScope, AnalysisDomain[]> = {
  GEAR: ["ARMOR", "WEAPONS"], ARMOR: ["ARMOR"], WEAPONS: ["WEAPONS"], ACCESSORIES: ["ACCESSORIES"], PETS: ["PETS"],
  FISHING: ["FISHING"], MINING: ["MINING"], SURVIVABILITY: ["ARMOR"], DAMAGE: ["ARMOR", "WEAPONS"], MAGE: ["ARMOR", "WEAPONS"],
  ARCHER: ["ARMOR", "WEAPONS"], BERSERK: ["ARMOR", "WEAPONS"], GENERAL: ["ARMOR", "WEAPONS"], CLARIFY: [],
};

export function routeAdvisorQuestion(input: { question: string; profile: Pick<NormalizedSkyBlockProfile, "progression">; conversationState?: AdvisorConversationState }): AdvisorRoute {
  const text = input.question.toLowerCase(), armorSlots: AdvisorRoute["armorSlots"] = [];
  if (/\bhelmet\b/.test(text)) armorSlots.push("helmet"); if (/\bchestplate\b|\bchest plate\b/.test(text)) armorSlots.push("chestplate");
  if (/\bleggings\b/.test(text)) armorSlots.push("leggings"); if (/\bboots\b/.test(text)) armorSlots.push("boots");
  const explicitGoal = detectExplicitGoal(text), explicitRole = detectExplicitRole(text);
  const inferredRole = explicitRole ?? input.conversationState?.role ?? normalizeRole(input.profile.progression.dungeons.selectedClass);
  const explicitDomain = detectDomain(text), followUpDomain = isFollowUp(text) ? input.conversationState?.currentDomain : undefined;
  const domain = explicitDomain ?? followUpDomain ?? null;
  const goal = explicitGoal ?? (followUpDomain ? input.conversationState?.goal : undefined) ?? goalFromExplicitScope(text) ?? "GENERAL_UPGRADE";
  const mechanics = /\bsweep\b/.test(text) ? ["SWEEP"] : [];
  let scope: AnalysisScope, reason: string, routedDomain: ProfileIntelligenceDomain | null = domain;
  if (domain === "ACCESSORIES") [scope, reason] = ["ACCESSORIES", "The question explicitly asks about accessories or Magical Power."];
  else if (domain === "FISHING") [scope, reason] = ["FISHING", "The question explicitly asks about fishing progression."];
  else if (domain === "MINING") [scope, reason] = ["MINING", "The question explicitly asks about mining progression."];
  else if (domain === "DUNGEONS") [scope, reason] = [scopeForDungeonQuestion(text, goal, armorSlots), "The question asks about Dungeon progression or combat gear."];
  else if (/\bpets?\b/.test(text)) [scope, reason] = ["PETS", "The question explicitly asks about pets."];
  else if (/\boverall\b|\bgeneral\b|\baccount progression\b/.test(text)) { scope = "GENERAL"; routedDomain = "DUNGEONS"; reason = "The question explicitly requests general account progression."; }
  else { scope = "CLARIFY"; routedDomain = null; reason = "The broad question does not identify a supported progression domain."; }
  return advisorRouteSchema.parse({ scope, goal, inferredRole: inferredRole ?? null, activeDomains: domainsByScope[scope], clarificationRecommended: scope === "CLARIFY", reason, armorSlots, domain: routedDomain, mechanics });
}

function detectDomain(text: string): ProfileIntelligenceDomain | null {
  if (/\bmagical power\b|\bmp\b|\baccessor(?:y|ies)\b|\btalismans?\b/.test(text)) return "ACCESSORIES";
  if (/\bfishing\b|\bfish(?:ing)? rod\b|\bsea creature\b/.test(text)) return "FISHING";
  if (/\bmining\b|\bhotm\b|\bheart of the mountain\b|\bpowder\b|\bdrill\b|\bpickaxe\b/.test(text)) return "MINING";
  if (/\bf\d+\b|\bfloor\b|\bcatacombs?\b|\bdungeons?\b|\bmage\b|\barcher\b|\bberserk\b|\bmelee\b|\bshortbow\b|\bbow\b|\barmor\b|\bhelmet\b|\bchestplate\b|\bleggings\b|\bboots\b|\bweapons?\b|\bsword\b|\bwand\b/.test(text)) return "DUNGEONS";
  return null;
}
function detectExplicitGoal(text: string): AdvisorGoal | null {
  if (/\bforaging\b/.test(text)) return "FORAGING"; if (/\bfishing\b/.test(text)) return "FISHING"; if (/\bmining\b/.test(text)) return "MINING";
  if (/\bmagical power\b|\bmp\b/.test(text)) return "MAGICAL_POWER"; if (/\bintelligence\b|\bmana\b/.test(text)) return "INTELLIGENCE";
  if (/\battack speed\b/.test(text)) return "ATTACK_SPEED"; if (/\bcrit(?:ical)? damage\b/.test(text)) return "CRIT_DAMAGE";
  if (/\bstrength\b/.test(text)) return "STRENGTH"; if (/\bspeed\b|\bfaster\b/.test(text)) return "SPEED";
  if (/\bhealth\b/.test(text)) return "HEALTH"; if (/\bdefen[cs]e\b/.test(text)) return "DEFENSE";
  if (/\bsurviv(?:e|ability)\b|\bdying\b|\btanky\b|\btankier\b/.test(text)) return "SURVIVABILITY";
  if (/\bdamage\b|\bdps\b|\bstronger\b/.test(text)) return "DAMAGE"; return null;
}
function goalFromExplicitScope(text: string): AdvisorGoal | null {
  if (/\baccessor(?:y|ies)\b|\btalismans?\b/.test(text)) return "MAGICAL_POWER"; if (/\bpets?\b/.test(text)) return "PET";
  if (/\barmor\b|\bhelmet\b|\bchestplate\b|\bleggings\b|\bboots\b/.test(text)) return "ARMOR";
  if (/\bweapons?\b|\bsword\b|\bwand\b|\bbow\b|\bshortbow\b/.test(text)) return "WEAPON"; return null;
}
function detectExplicitRole(text: string): AdvisorRole | null {
  if (/\bmage\b/.test(text)) return "mage"; if (/\barcher\b/.test(text)) return "archer"; if (/\bberserk\b|\bmelee\b/.test(text)) return "berserk";
  if (/\btank\b/.test(text)) return "tank"; if (/\bhealer\b/.test(text)) return "healer"; return null;
}
function normalizeRole(value: string | null): AdvisorRole | null { return value !== null && Object.hasOwn(roleScopes, value) ? value as AdvisorRole : null; }
function isFollowUp(text: string) { return /\b(okay|then|instead|what about|how about|also|next)\b/.test(text); }
function scopeForDungeonQuestion(text: string, goal: AdvisorGoal, armorSlots: readonly string[]): AnalysisScope {
  if (goal === "INTELLIGENCE" || /\bmage\b/.test(text)) return "MAGE"; if (/\barcher\b|\bbow\b|\bshortbow\b/.test(text)) return "ARCHER";
  if (/\bberserk\b|\bmelee\b/.test(text)) return "BERSERK"; if (["SURVIVABILITY", "HEALTH", "DEFENSE"].includes(goal)) return "SURVIVABILITY";
  if (["DAMAGE", "STRENGTH", "CRIT_DAMAGE", "ATTACK_SPEED"].includes(goal)) return "DAMAGE"; if (armorSlots.length || /\barmor\b/.test(text)) return "ARMOR";
  if (/\bweapons?\b|\bsword\b|\bwand\b/.test(text)) return "WEAPONS"; return "GEAR";
}
