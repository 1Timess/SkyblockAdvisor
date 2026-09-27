import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import type { HypixelItemDefinition } from "../hypixel/types";
import { buildCollectionProgress, buildCraftedMinions, buildMinionRecipeLeads, parseCollectionDefinitions,
  selectCollectionFocus, selectCraftedMinions, selectMinionRecipeLeads } from "./progression";

export function buildCollectionAdvisorContext(profile: NormalizedSkyBlockProfile, question: string,
  resource: { collections: Record<string, unknown>; version?: string; lastUpdated?: number },
  items: readonly HypixelItemDefinition[]): AdvisorDomainContext {
  const definitions = parseCollectionDefinitions(resource);
  const progress = buildCollectionProgress(profile, definitions);
  const craftedMinions = buildCraftedMinions(profile.craftedGenerators);
  const minionRecipeLeads = buildMinionRecipeLeads(definitions, progress, craftedMinions, items);
  return { domain: "COLLECTIONS", sourceVersion: resource.version ?? null, sourceUpdatedAt: resource.lastUpdated ?? null,
    totalCollections: progress.length, craftedMinionTierCount: new Set(profile.craftedGenerators).size,
    craftedMinionTypes: craftedMinions.length, minionFocus: selectCraftedMinions(craftedMinions, question),
    minionRecipeCount: minionRecipeLeads.length, minionRecipeFocus: selectMinionRecipeLeads(minionRecipeLeads, question),
    focus: selectCollectionFocus(progress, question),
    note: "unlockedTier is explicit API evidence; countTier is inferred from the member's count and published thresholds. Counts do not prove a claimed unlock. Minion recipe leads join collection unlock names to Hypixel item generator IDs; NOT_OBSERVED means no matching crafted tier was reported, not proof of ownership or craftability. nextCraftTier is the next catalogued tier above the highest observed craft, not a cost or guaranteed upgrade. Crafted tiers do not reveal placed minions, active production, ingredients, or upgrade costs." };
}
