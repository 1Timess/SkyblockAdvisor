import type { CandidateItem } from "../../schemas/catalog";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { isMiningRelevantDeployable } from "../reference/deployable-mechanics";
import { checkItemRequirements } from "../reference/requirements";
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

  const usable = new Set(deployables.filter(item => checkItemRequirements(item, input.profile).every(check => check.status === "MET")).map(item => item.id));
  const progressionDeployables = deployables.filter(item => !usable.has(item.id) || !isDominatedByUsableDeployable(item, deployables, usable));

  const lanes: Record<string, AdvisorCandidate[]> = {};
  for (const item of progressionDeployables) {
    if (ownedIds.has(item.id)) continue;
    const candidate = prepareCandidate("tool", item, input.profile, input.quotes,
      { budgetCoins: input.budgetCoins, ownedItemIds: ownedIds, eligibilityMode: "ADVISOR_DISCOVERY" });
    if (!candidate || !item.deployableMechanics) continue;
    const baseline = bestOwnedDeployableBaseline(item, ownedDeployables);
    if (baseline && !deployableStrictlyImproves(item, baseline)) continue;
    const changes: NonNullable<AdvisorCandidate["knownChanges"]> = {};
    for (const stat of miningDeployableStats) {
      const current = baseline?.deployableMechanics?.effects[stat] ?? 0;
      const target = item.deployableMechanics.effects[stat] ?? 0;
      if (target !== current) changes[stat] = { current, candidate: target };
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


function isDominatedByUsableDeployable(item: CandidateItem, deployables: readonly CandidateItem[], usable: ReadonlySet<string>) {
  const mechanics = item.deployableMechanics;
  if (!mechanics) return false;
  return deployables.some(other => {
    if (other.id === item.id || !usable.has(other.id) || !other.deployableMechanics) return false;
    let strictlyBetter = false;
    for (const stat of miningDeployableStats) {
      const current = mechanics.effects[stat] ?? 0, alternative = other.deployableMechanics.effects[stat] ?? 0;
      if (alternative < current) return false;
      if (alternative > current) strictlyBetter = true;
    }
    return strictlyBetter;
  });
}


export function deployableStrictlyImproves(candidate: CandidateItem, baseline: CandidateItem) {
  if (!candidate.deployableMechanics || !baseline.deployableMechanics) return false;
  let strictlyBetter = false;
  for (const stat of miningDeployableStats) {
    const current = baseline.deployableMechanics.effects[stat] ?? 0;
    const target = candidate.deployableMechanics.effects[stat] ?? 0;
    if (target < current) return false;
    if (target > current) strictlyBetter = true;
  }
  return strictlyBetter;
}

function bestOwnedDeployableBaseline(candidate: CandidateItem, owned: readonly CandidateItem[]) {
  const comparable = owned.filter(item => item.deployableMechanics && deployableStrictlyImproves(candidate, item));
  if (!comparable.length) return owned.length ? null : undefined;
  return comparable.reduce((best, item) => {
    const bestScore = miningDeployableStats.reduce((sum, stat) => sum + (best.deployableMechanics?.effects[stat] ?? 0), 0);
    const itemScore = miningDeployableStats.reduce((sum, stat) => sum + (item.deployableMechanics?.effects[stat] ?? 0), 0);
    return itemScore > bestScore ? item : best;
  });
}
