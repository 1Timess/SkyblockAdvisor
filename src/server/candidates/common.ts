import type { CandidateItem } from "../../schemas/catalog";
import type { AdvisorCandidate } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { checkItemRequirements } from "../reference/requirements";

export interface CandidateFilterOptions {
  budgetCoins?: number;
  ownedItemIds?: ReadonlySet<string>;
  eligibilityMode?: "ACTIONABLE_ONLY" | "ADVISOR_DISCOVERY";
}

export function prepareCandidate(
  domain: AdvisorCandidate["domain"],
  item: CandidateItem,
  profile: NormalizedSkyBlockProfile,
  quotes: ReadonlyMap<string, MarketQuote>,
  options: CandidateFilterOptions,
): AdvisorCandidate | null {
  if (options.ownedItemIds?.has(item.id)) return null;
  const checks = checkItemRequirements(item, profile);
  const discovery = options.eligibilityMode === "ADVISOR_DISCOVERY";
  if (!discovery && checks.some(check => check.status === "NOT_MET")) return null;
  const quote = quotes.get(item.marketKey);
  if (!discovery && options.budgetCoins !== undefined && quote && quote.coins > options.budgetCoins) return null;
  const warnings: string[] = [];
  if (checks.some(check => check.status === "UNKNOWN")) warnings.push("One or more requirements could not be checked from the available profile data.");
  if (item.unparsedRequirementText.length) warnings.push("One or more requirement lines are not structurally understood.");
  if (options.budgetCoins !== undefined && !quote) warnings.push(discovery ? "Price is unknown, so budget feasibility is unknown." : "Price is unknown, so the hard budget could not be checked.");
  return {
    id: item.id,
    domain,
    item,
    price: quote ? { coins: quote.coins, observedAt: quote.observedAt, confidence: quote.confidence } : undefined,
    requirements: [...item.requirements.map(requirement => requirement.sourceText), ...item.unparsedRequirementText],
    abilityText: item.abilityText,
    setBonusText: item.setBonusText,
    warnings,
  };
}

export function dedupeCandidates(lanes: Readonly<Record<string, readonly AdvisorCandidate[]>>, cap = 20): AdvisorCandidate[] {
  const result: AdvisorCandidate[] = [], seen = new Set<string>();
  for (const lane of Object.values(lanes)) for (const candidate of lane) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id); result.push(candidate);
    if (result.length === cap) return result;
  }
  return result;
}
