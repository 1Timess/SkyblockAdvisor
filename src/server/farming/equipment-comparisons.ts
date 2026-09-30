import type { CandidateItem } from "../../schemas/catalog";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import type { NeuRepository } from "../reference/neu/repository";
import { checkItemRequirements } from "../reference/requirements";

/** Identity stays canonical across renamed armor/equipment. Never use display names as recipe keys. */
export function farmingEquipmentFamily(id: string): string | null {
  const armor = id.match(/^(?:FARM_SUIT|FARM_ARMOR|PUMPKIN|MELON|CROPIE|SQUASH|FERMENTO|HELIANTHUS)_(HELMET|CHESTPLATE|LEGGINGS|BOOTS)$/);
  if (armor) return `armor:${armor[1]}`;
  const equipment = id.match(/^(?:LOTUS|PEONY|BLOSSOM)_(NECKLACE|CLOAK|BELT|BRACELET)$/);
  if (equipment) return `equipment:${equipment[1]}`;
  const tool = id.match(/^((?:THEORETICAL_HOE_[A-Z_]+|MELON_DICER|PUMPKIN_DICER|CACTUS_KNIFE|COCO_CHOPPER|FUNGI_CUTTER|ECLIPSE_HOE|SUNFLOWER_HOE|MOONFLOWER_HOE|WILD_ROSE_HOE))(?:_([123]))?$/);
  return tool ? `tool:${tool[1]}` : null;
}

/** Only an explicit nine-cell crafting recipe establishes a supported direct upgrade. */
export function recipeConsumes(recipe: unknown, id: string): boolean {
  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe)) return false;
  const cells = Object.entries(recipe).filter(([key]) => /^[ABC][123]$/.test(key));
  return cells.some(([, value]) => typeof value === "string" && value === `${id}:1`);
}

export function buildFarmingEquipmentComparisons(profile: NormalizedSkyBlockProfile, catalog: readonly CandidateItem[], neu: NeuRepository | null,
  quotes: ReadonlyMap<string, MarketQuote> = new Map(), gardenLevel: number | null = null, nowMs = Date.now()) {
  const checks = (item: CandidateItem) => checkItemRequirements(item, profile).map(check => {
    if (check.requirement.kind !== "GARDEN_LEVEL") return check;
    return { ...check, actual: gardenLevel, status: gardenLevel === null ? "UNKNOWN" as const
      : gardenLevel >= check.requirement.level ? "MET" as const : "NOT_MET" as const };
  });
  const byId = new Map(catalog.map(item => [item.id, item]));
  const owned = new Set(profile.inventoryItems.flatMap(item => item.id ? [item.id] : []));
  const familyItems = new Map<string, CandidateItem[]>();
  for (const item of catalog) {
    const family = farmingEquipmentFamily(item.id);
    if (family) familyItems.set(family, [...(familyItems.get(family) ?? []), item]);
  }
  const successorCache = new Map<string, boolean>();
  const hasOwnedSuccessor = (target: CandidateItem): boolean => {
    const cached = successorCache.get(target.id);
    if (cached !== undefined) return cached;
    const peers = familyItems.get(farmingEquipmentFamily(target.id)!) ?? [];
    const seen = new Set<string>([target.id]), pending = [target.id];
    while (pending.length) {
      const id = pending.pop()!;
      for (const next of peers) {
        if (seen.has(next.id) || farmingEquipmentFamily(next.id) !== farmingEquipmentFamily(target.id) || !recipeConsumes(neu?.getById(next.id)?.recipe, id)) continue;
        if (owned.has(next.id)) { successorCache.set(target.id, true); return true; }
        seen.add(next.id); pending.push(next.id);
      }
    }
    successorCache.set(target.id, false);
    return false;
  };
  const relevant = profile.inventoryItems.filter(item => item.id && (farmingEquipmentFamily(item.id) || item.id === "RANCHERS_BOOTS" || item.id === "FARMER_BOOTS"));
  const mechanics = [...new Map(relevant.map(item => [item.id!, item])).values()].slice(0, 16).map(item => {
    const reference = byId.get(item.id!);
    return { itemId: item.id!, observedName: item.name, catalogName: reference?.name ?? null,
      source: item.source, referenceLore: reference?.lore ?? [],
      catalogFortune: reference?.stats.farmingFortune ?? null, observedFortune: item.stats.farmingFortune ?? null,
      abilityText: reference?.abilityText ?? [], setBonusText: reference?.setBonusText ?? [],
      requirements: reference ? checks(reference) : [],
      utilityWarning: /^(RANCHERS_BOOTS|FARMER_BOOTS)$/.test(item.id!)
        ? "Preserve speed-control utility when assessing farming boots; no replacement or equipped status is established." : null,
      sourceStatus: reference?.sources.neu ? "CATALOG_MATCHED" as const : "UNREPORTED" as const };
  });
  const comparisons = relevant.flatMap(current => {
    const family = farmingEquipmentFamily(current.id!);
    if (!family || !neu) return [];
    const baseline = byId.get(current.id!);
    const peers = familyItems.get(family) ?? [];
    const direct = peers.filter(target => target.id !== current.id && !owned.has(target.id) &&
      recipeConsumes(neu.getById(target.id)?.recipe, current.id!) && !hasOwnedSuccessor(target));
    // A fallback is a template-stat alternative, never an inferred crafting chain.
    // Only the strongest visible same-slot template may establish a replacement baseline.
    const baselineFortune = baseline?.stats.farmingFortune;
    const higherOwned = peers.some(peer => owned.has(peer.id) && (peer.stats.farmingFortune ?? -Infinity) > (baselineFortune ?? Infinity));
    const alternatives = !direct.length && !family.startsWith("tool:") && baselineFortune !== undefined && !higherOwned
      ? peers.filter(target => target.sources.neu && !owned.has(target.id) && !hasOwnedSuccessor(target) &&
        (target.stats.farmingFortune ?? -Infinity) > baselineFortune)
        .sort((a, b) => a.stats.farmingFortune! - b.stats.farmingFortune! || a.id.localeCompare(b.id)).slice(0, 1) : [];
    return [...direct, ...alternatives].map(target => {
      const isDirect = direct.some(item => item.id === target.id);
      const quote = quotes.get(target.marketKey);
      const currentFortune = baseline?.stats.farmingFortune ?? null, targetFortune = target.stats.farmingFortune ?? null;
      return { currentItemId: current.id!, currentName: current.name, targetItemId: target.id, targetName: target.name,
        basis: isDirect ? "DIRECT_CATALOG_RECIPE" as const : "SAME_SLOT_CATALOG_ALTERNATIVE" as const, currentCatalogFortune: currentFortune, targetCatalogFortune: targetFortune,
        catalogFortuneDifference: currentFortune !== null && targetFortune !== null ? targetFortune - currentFortune : null,
        requirements: checks(target), unparsedRequirements: target.unparsedRequirementText,
        abilityText: target.abilityText, setBonusText: target.setBonusText,
        purchasePrice: quote ? { coins: quote.coins, observedAt: quote.observedAt, confidence: quote.confidence,
          ageHours: Math.max(0, (nowMs - Date.parse(quote.observedAt)) / 3_600_000),
          freshness: nowMs - Date.parse(quote.observedAt) > 86_400_000 || Date.parse(quote.observedAt) > nowMs ? "STALE" as const : "RECENT" as const } : null,
        warnings: ["Catalog template comparison only; conditional and level-dependent template values are not an effective Fortune gain on the observed modified item.",
          isDirect ? "Direct recipe consumes the current item. Ingredients, craft unlocks, modifier transfer and total upgrade cost are unverified."
            : "Same-slot catalog alternative selected by template Fortune only; no crafting relationship, net improvement, acquisition feasibility or value ranking is established.",
          ...(quote && (nowMs - Date.parse(quote.observedAt) > 86_400_000 || Date.parse(quote.observedAt) > nowMs)
            ? ["Market quote is stale or future-dated; verify current price before any budget or value decision."] : []),
          "Market quote, when present, is target acquisition price, not crafting cost or a best-value ranking.",
          ...(family.startsWith("tool:") ? ["Tool level, rarity, gemstones and crop-specific bonuses require a matched configuration; do not compare template totals as a leveled tool replacement."] : []),
          ...(family.startsWith("armor:") ? ["Set effects and pest bonuses require checking the intended equipped combination; inventory presence does not establish a farming set."] : [])] };
    });
  });
  return { mechanics, comparisons: [...new Map(comparisons.map(value => [value.targetItemId, value])).values()].slice(0, 12),
    catalogDownloadedAt: neu?.getMetadata().downloadedAt ?? null,
    coverage: neu && catalog.length ? "CATALOG_LOADED" as const : "UNREPORTED" as const };
}
