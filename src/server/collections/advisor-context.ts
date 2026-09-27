import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { buildCollectionProgress, buildCraftedMinions, buildMinionRecipeLeads, parseCollectionDefinitions,
  selectCollectionFocus, selectCraftedMinions, selectMinionRecipeLeads } from "./progression";

export function buildCollectionAdvisorContext(profile: NormalizedSkyBlockProfile, question: string,
  resource: { collections: Record<string, unknown>; version?: string; lastUpdated?: number }): AdvisorDomainContext {
  const definitions = parseCollectionDefinitions(resource);
  const progress = buildCollectionProgress(profile, definitions);
  const craftedMinions = buildCraftedMinions(profile.craftedGenerators);
  const minionRecipeLeads = buildMinionRecipeLeads(definitions, progress, craftedMinions);
  return { domain: "COLLECTIONS", sourceVersion: resource.version ?? null, sourceUpdatedAt: resource.lastUpdated ?? null,
    totalCollections: progress.length, craftedMinionTierCount: new Set(profile.craftedGenerators).size,
    craftedMinionTypes: craftedMinions.length, minionFocus: selectCraftedMinions(craftedMinions, question),
    minionRecipeCount: minionRecipeLeads.length, minionRecipeFocus: selectMinionRecipeLeads(minionRecipeLeads, question),
    focus: selectCollectionFocus(progress, question),
    note: "unlockedTier is explicit API evidence; countTier is inferred from the member's count and published thresholds. Counts do not prove a claimed unlock. Minion recipe leads are a sample of collection unlocks, not ranked craft costs. NO_EXACT_ID_MATCH means a crafted ID matching the recipe name was not observed; it does not prove the minion was never crafted. Crafted tiers do not reveal placed minions, active production, ingredients, or upgrade costs." };
}
