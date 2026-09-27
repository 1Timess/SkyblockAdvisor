import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import type { HypixelItemDefinition } from "../hypixel/types";
import { buildCollectionProgress, buildCraftedMinions, buildMinionRecipeLeads, buildMinionUpgradeLeads, parseCollectionDefinitions,
  selectCollectionFocus, selectCraftedMinions, selectMinionRecipeLeads } from "./progression";

export function buildCollectionAdvisorContext(profile: NormalizedSkyBlockProfile, question: string,
  resource: { collections: Record<string, unknown>; version?: string; lastUpdated?: number },
  items: readonly HypixelItemDefinition[]): AdvisorDomainContext {
  const definitions = parseCollectionDefinitions(resource);
  const progress = buildCollectionProgress(profile, definitions);
  const craftedMinions = buildCraftedMinions(profile.craftedGenerators);
  const minionUpgradeLeads = buildMinionUpgradeLeads(craftedMinions, items);
  const minionRecipeLeads = buildMinionRecipeLeads(definitions, progress, craftedMinions, items);
  return { domain: "COLLECTIONS", sourceVersion: resource.version ?? null, sourceUpdatedAt: resource.lastUpdated ?? null,
    totalCollections: progress.length, craftedMinionTierCount: new Set(profile.craftedGenerators).size,
    craftedMinionTypes: craftedMinions.length, minionFocus: selectCraftedMinions(craftedMinions, question),
    minionUpgradeCount: minionUpgradeLeads.length,
    minionUpgradeFocus: selectCraftedMinions(minionUpgradeLeads, question).filter((entry): entry is typeof minionUpgradeLeads[number] => "nextCraftTier" in entry),
    minionRecipeCount: minionRecipeLeads.length, minionRecipeFocus: selectMinionRecipeLeads(minionRecipeLeads, question),
    focus: selectCollectionFocus(progress, question),
    note: "unlockedTier is explicit API evidence; countTier is inferred from the member's count and published thresholds. Counts do not prove a claimed unlock. Recipe leads join collection unlocks to Hypixel generator IDs. minionUpgradeFocus also includes crafted minion families with no collection recipe, such as Slayer minions. NOT_OBSERVED is only absence from reported craft history. A nextCraftTier is the next catalogued tier above the highest observed craft, not proof of owned prerequisites, affordability, or recipe access. Crafted tiers do not reveal placed minions, production, ingredients, or upgrade costs." };
}
