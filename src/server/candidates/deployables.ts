import type { CandidateItem } from "../../schemas/catalog";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { isMiningRelevantDeployable } from "../reference/deployable-mechanics";
import { prepareCandidate } from "./common";

const miningDeployableStats = ["miningSpeed", "miningFortune", "gemstoneSpread", "heatResistance", "coldResistance"] as const;

export function buildMiningDeployableLanes(input: {
  profile: NormalizedSkyBlockProfile;
  catalog: readonly CandidateItem[];
  quotes: ReadonlyMap<string, MarketQuote>;
  budgetCoins?: number;
}): Record<string, AdvisorCandidate[]> {
  const ownedIds = new Set(input.profile.inventoryItems.flatMap(item => item.id ? [item.id] : []));
  const deployables = input.catalog.filter(item => isMiningRelevantDeployable(item.deployableMechanics));
  if (!deployables.length) return {};

  const ownedDeployables = deployables.filter(item => ownedIds.has(item.id));
  const baseline = Object.fromEntries(miningDeployableStats.map(stat => [stat,
    Math.max(0, ...ownedDeployables.map(item => item.deployableMechanics?.effects[stat] ?? 0))]));

  const lanes: Record<string, AdvisorCandidate[]> = {};
  for (const item of deployables) {
    if (ownedIds.has(item.id)) continue;
    const candidate = prepareCandidate("tool", item, input.profile, input.quotes,
      { budgetCoins: input.budgetCoins, ownedItemIds: ownedIds, eligibilityMode: "ADVISOR_DISCOVERY" });
    if (!candidate || !item.deployableMechanics) continue;
    const changes: NonNullable<AdvisorCandidate["knownChanges"]> = {};
    for (const stat of miningDeployableStats) {
      const current = baseline[stat] ?? 0, target = item.deployableMechanics.effects[stat] ?? 0;
      if (target > current) changes[stat] = { current, candidate: target };
    }
    if (!Object.keys(changes).length) continue;

    const warnings = [
      ...candidate.warnings,
      "Deployable effects are temporary activity buffs and are not part of the player's permanent Mining stat baseline.",
      ...(item.deployableMechanics.exclusiveBuff ? ["Only one deployable buff applies at a time."] : []),
      ...(item.deployableMechanics.mineshaftGlobal ? ["This deployable's buff applies throughout a Glacite Mineshaft regardless of normal range."] : []),
    ];
    const contextual: AdvisorCandidate = { ...candidate, knownChanges: changes, warnings };
    for (const stat of Object.keys(changes)) (lanes[stat] ??= []).push(contextual);
  }
  return lanes;
}
