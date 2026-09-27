import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { buildOwnedEnchantingState } from "./owned-state";
import { buildExperimentRewardOpportunities, selectExperimentRewardFocus } from "./reward-opportunities";

export function buildEnchantingAdvisorContext(profile: NormalizedSkyBlockProfile, question: string): AdvisorDomainContext {
  const xp = profile.progression.skills.enchanting?.xp;
  // The normalized profile retains skill XP, but currently does not retain raw
  // Experimentation history. Do not substitute guessed claims or meter state.
  const state = buildOwnedEnchantingState(xp === undefined ? {} : { player_data: { experience: { SKILL_ENCHANTING: xp } } });
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
    possibleRewardCount: opportunities.progression.length,
    note: "Possible drops only. Item fit checks visible lower enchant levels, not compatibility or ownership. RNG Meter progress and charges are unknown." };
}
