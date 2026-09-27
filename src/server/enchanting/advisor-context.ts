import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { buildExperimentRewardOpportunities, selectExperimentRewardFocus } from "./reward-opportunities";

export function buildEnchantingAdvisorContext(profile: NormalizedSkyBlockProfile, question: string): AdvisorDomainContext {
  const state = profile.progression.enchanting;
  const opportunities = buildExperimentRewardOpportunities(state);
  const names = opportunities.progression.map(entry => entry.reward.name)
    .filter(name => new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i").test(question));
  const visibleItems = profile.inventoryItems.map(item => ({ name: item.name, enchantments: item.enchantments }));
  const focus = selectExperimentRewardFocus(state, names, visibleItems);
  return { domain: "ENCHANTING", enchantingLevel: state.skill?.level ?? null,
    enchantingXp: state.skill?.xp ?? null, xpActivity: focus.enchantingXpActivity,
    matchedRewards: focus.matchedRewards.map(entry => ({ name: entry.reward.name, kind: entry.reward.kind,
      access: entry.access, requiredEnchantingLevel: entry.requiredEnchantingLevel,
      lowerEnchantedItems: entry.lowerEnchantedItems, itemFit: entry.itemFit })),
    possibleRewardCount: opportunities.progression.length, experimentation: state.experimentation,
    note: "Possible drops only. Attempts, claims, best scores, and bonus clicks are observed counters, not reward ownership or current charges. Item fit does not prove compatibility. RNG Meter progress is unknown." };
}
