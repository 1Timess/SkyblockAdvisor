import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { buildCollectionProgress, buildCraftedMinions, parseCollectionDefinitions, selectCollectionFocus, selectCraftedMinions } from "./progression";

export function buildCollectionAdvisorContext(profile: NormalizedSkyBlockProfile, question: string,
  resource: { collections: Record<string, unknown>; version?: string; lastUpdated?: number }): AdvisorDomainContext {
  const progress = buildCollectionProgress(profile, parseCollectionDefinitions(resource));
  const craftedMinions = buildCraftedMinions(profile.craftedGenerators);
  return { domain: "COLLECTIONS", sourceVersion: resource.version ?? null, sourceUpdatedAt: resource.lastUpdated ?? null,
    totalCollections: progress.length, craftedMinionTierCount: new Set(profile.craftedGenerators).size,
    craftedMinionTypes: craftedMinions.length, minionFocus: selectCraftedMinions(craftedMinions, question),
    focus: selectCollectionFocus(progress, question),
    note: "Only listed tiers and unlock text come from Hypixel resources. Reached thresholds without a tier signal are unconfirmed. Crafted minion IDs may differ from collection IDs; minionFocus is independent evidence. Crafted tiers do not reveal placed minions, active production, or recipe materials." };
}
