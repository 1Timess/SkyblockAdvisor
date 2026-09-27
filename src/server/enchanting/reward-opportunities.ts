import type { OwnedEnchantingState } from "../../schemas/owned-enchanting";
import type { PossibleExperimentReward } from "../../schemas/enchanting-mechanics";
import { possibleExperimentRewards } from "../reference/enchanting-rewards";
import { experimentationMechanics, researchedExperimentTiers } from "../reference/enchanting-mechanics";

export type ExperimentRewardOpportunity = {
  reward: PossibleExperimentReward;
  access: "LEVEL_UNKNOWN" | "TABLE_LOCKED" | "TIER_LOCKED" | "POSSIBLE_AT_LEVEL" | "TIER_UNVERIFIED";
  requiredEnchantingLevel: number | null;
};

// This is an opportunity view of the reward pool, not evidence of ownership,
// a ranking, an RNG Meter estimate, or a probability of receiving an item.
export function buildExperimentRewardOpportunities(state: OwnedEnchantingState): {
  progression: ExperimentRewardOpportunity[];
  cosmetic: ExperimentRewardOpportunity[];
} {
  const entries = possibleExperimentRewards.map(reward => {
    const tier = reward.minimumStake === null ? null : researchedExperimentTiers.find(entry =>
      entry.experiment === "SUPERPAIRS" && entry.stake === reward.minimumStake);
    const requiredEnchantingLevel = tier?.requiredEnchantingLevel ?? null;
    const level = state.skill?.level;
    const access: ExperimentRewardOpportunity["access"] = level === undefined
      ? "LEVEL_UNKNOWN"
      : level < experimentationMechanics.accessLevel
        ? "TABLE_LOCKED"
        : requiredEnchantingLevel === null
          ? "TIER_UNVERIFIED"
          : level < requiredEnchantingLevel ? "TIER_LOCKED" : "POSSIBLE_AT_LEVEL";
    return { reward, access, requiredEnchantingLevel };
  });
  return {
    progression: entries.filter(entry => entry.reward.kind !== "DYE" && entry.reward.kind !== "COSMETIC"),
    cosmetic: entries.filter(entry => entry.reward.kind === "DYE" || entry.reward.kind === "COSMETIC"),
  };
}

// Only an explicit item goal can promote a possible drop for review. Ownership,
// price, and upgrade value must be checked by downstream item mechanics.
export function selectExperimentRewardFocus(
  state: OwnedEnchantingState, requestedRewardNames: readonly string[] = []
): { enchantingXpActivity: boolean; matchedRewards: ExperimentRewardOpportunity[] } {
  const names = new Set(requestedRewardNames.map(name => name.trim().toLowerCase()).filter(Boolean));
  const { progression } = buildExperimentRewardOpportunities(state);
  return {
    enchantingXpActivity: state.skill !== null && state.skill.level >= experimentationMechanics.accessLevel
      && state.skill.level < 60,
    matchedRewards: progression.filter(entry => names.has(entry.reward.name.toLowerCase())),
  };
}
