import type { CandidateItem } from "../../schemas/catalog";
import { raritySchema, type ItemRarity } from "../../schemas/items";
import type { HypixelItemDefinition } from "../hypixel/types";
import { extractAbilityText } from "../skyblock/items/process-item";
import { categoriesForItemType, parseFooter, stripFormatting } from "../skyblock/items/parse-footer";
import { extractStats } from "../skyblock/items/parse-stats";
import { parseItemRequirements } from "./requirements";
import type { NeuRepository } from "./neu/repository";
import { parseDrillComponentMechanics } from "./drill-component-mechanics";
import { parseDeployableMechanics } from "./deployable-mechanics";

export interface ItemCatalog {
  getById(id: string): CandidateItem | undefined;
  getAll(): readonly CandidateItem[];
  getDiagnostics(): ItemCatalogDiagnostics;
}
export interface ItemCatalogDiagnostics {
  hypixelItems: number;
  neuEnriched: number;
  missingNeu: number;
  neuParseFailures: number;
}

export class InMemoryItemCatalog implements ItemCatalog {
  private byId: Map<string, CandidateItem>;
  constructor(private items: readonly CandidateItem[], private diagnostics: ItemCatalogDiagnostics) {
    this.byId = new Map(items.map(item => [item.id, item]));
  }
  getById(id: string) { return this.byId.get(id); }
  getAll() { return this.items; }
  getDiagnostics() { return this.diagnostics; }
}

function rarity(value?: string): ItemRarity | null {
  const parsed = raritySchema.safeParse(value?.toLowerCase().replaceAll(" ", "_"));
  return parsed.success ? parsed.data : null;
}

export function categoriesForReferenceLore(lore: readonly string[]): string[] {
  if (!lore.some(line => line.trim().toLowerCase() === "drill part")) return [];
  const text = lore.join(" ").replace(/\s+/g, " ");
  if (/Drill Engine\s+slot/i.test(text)) return ["tool", "drill_component", "drill_engine"];
  if (/Fuel Tank\s+slot/i.test(text)) return ["tool", "drill_component", "drill_fuel_tank"];
  if (/Upgrade Module\s+slot/i.test(text)) return ["tool", "drill_component", "drill_upgrade_module"];
  return ["tool", "drill_component"];
}

function wikiUrl(infoType?: string, info?: string[]) {
  if (infoType !== "WIKI_URL") return null;
  return info?.find(value => /^https?:\/\//.test(value)) ?? null;
}

export function buildItemCatalog(items: readonly HypixelItemDefinition[], neu?: NeuRepository): ItemCatalog {
  let neuEnriched = 0;
  const catalog = items.map(item => {
    const reference = neu?.getById(item.id);
    if (reference) neuEnriched++;
    const lore = (reference?.lore ?? []).map(stripFormatting);
    const footer = parseFooter(lore);
    const deployableMechanics = parseDeployableMechanics(lore);
    const categories = [...new Set([...footer.categories, ...categoriesForItemType(item.category), ...categoriesForReferenceLore(lore), ...(deployableMechanics ? ["deployable"] : [])])];
    const { stats } = extractStats(lore);
    const requirements = parseItemRequirements({ lore, slayerRequirement: reference?.slayer_req });
    return {
      id: item.id,
      name: stripFormatting(reference?.displayname ?? item.name),
      rarity: footer.rarity ?? rarity(item.tier),
      categories,
      stats,
      lore,
      ...extractAbilityText(lore),
      ...requirements,
      wiki: wikiUrl(reference?.infoType, reference?.info),
      marketKey: item.id,
      sources: { hypixel: true as const, neu: reference !== undefined },
      drillComponentMechanics: parseDrillComponentMechanics(lore),
      deployableMechanics,
    } satisfies CandidateItem;
  });
  return new InMemoryItemCatalog(catalog, {
    hypixelItems: items.length, neuEnriched, missingNeu: items.length - neuEnriched,
    neuParseFailures: neu?.getFailures().length ?? 0,
  });
}
