import type { AdvisorCandidate } from "../../schemas/candidates";
import type { GemstoneQuality, ProfileItem } from "../../schemas/items";
import type { MarketQuote } from "../../schemas/market";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

const qualityRank: Record<GemstoneQuality, number> = { ROUGH: 0, FLAWED: 1, FINE: 2, FLAWLESS: 3, PERFECT: 4 };
const miningStatByGemstone = { AMBER: "miningSpeed", JADE: "miningFortune", TOPAZ: "pristine" } as const;
const statByQuality: Record<keyof typeof miningStatByGemstone, Record<GemstoneQuality, number>> = {
  AMBER: { ROUGH: 4, FLAWED: 8, FINE: 16, FLAWLESS: 32, PERFECT: 40 },
  JADE: { ROUGH: 2, FLAWED: 4, FINE: 8, FLAWLESS: 16, PERFECT: 20 },
  TOPAZ: { ROUGH: 0.4, FLAWED: 0.8, FINE: 1.2, FLAWLESS: 1.6, PERFECT: 2 },
};
const gemMarketId: Record<keyof typeof miningStatByGemstone, string> = {
  AMBER: "PERFECT_AMBER_GEM", JADE: "PERFECT_JADE_GEM", TOPAZ: "PERFECT_TOPAZ_GEM",
};

export function buildMiningGemstoneUpgradeLanes(profile: NormalizedSkyBlockProfile, quotes: ReadonlyMap<string, MarketQuote>): Record<string, AdvisorCandidate[]> {
  const lanes: Record<string, AdvisorCandidate[]> = {};
  for (const item of profile.inventoryItems) {
    if (!item.gemstones) continue;
    for (const slot of item.gemstones.slots) {
      const fixedGemstone = slot.slotType in miningStatByGemstone ? slot.slotType as keyof typeof miningStatByGemstone : null;
      const gemstone = slot.gemstoneType && slot.gemstoneType in miningStatByGemstone ? slot.gemstoneType as keyof typeof miningStatByGemstone : fixedGemstone;
      if (!gemstone) continue;
      const stat = miningStatByGemstone[gemstone], candidate = gemstoneCandidate(item, slot, gemstone, stat, quotes);
      if (candidate) (lanes[stat] ??= []).push(candidate);
    }
  }
  return lanes;
}

function gemstoneCandidate(item: ProfileItem, slot: NonNullable<ProfileItem["gemstones"]>["slots"][number],
  gemstone: keyof typeof miningStatByGemstone, stat: string, quotes: ReadonlyMap<string, MarketQuote>): AdvisorCandidate | null {
  let operation: string, warning: string;
  if (slot.status === "LOCKED") {
    operation = `Unlock and fill ${slot.id}`;
    warning = `${item.name} has a locked ${slot.slotType} gemstone slot. This Divan slot needs a Gemstone Chamber before a ${gemstone} gemstone can be installed.`;
  } else if (slot.status === "UNLOCKED_EMPTY") {
    operation = `Fill empty ${slot.id}`;
    warning = `${item.name} has an unlocked but empty ${slot.slotType} gemstone slot that can accept ${gemstone}.`;
  } else if (slot.status === "FILLED" && slot.quality && qualityRank[slot.quality] < qualityRank.PERFECT) {
    operation = `Upgrade ${slot.id} to PERFECT`;
    warning = `${item.name} has ${slot.quality} ${gemstone} in ${slot.id}; PERFECT is a higher gemstone quality.`;
  } else return null;

  const current = slot.status === "FILLED" && slot.quality ? statByQuality[gemstone][slot.quality] : 0;
  const candidate = statByQuality[gemstone].PERFECT;
  const gemQuote = quotes.get(gemMarketId[gemstone]), chamberQuote = slot.status === "LOCKED" ? quotes.get("GEMSTONE_CHAMBER") : undefined;
  const priceKnown = Boolean(gemQuote) && (slot.status !== "LOCKED" || Boolean(chamberQuote));
  const priceCoins = priceKnown ? (gemQuote?.coins ?? 0) + (chamberQuote?.coins ?? 0) : undefined;
  const id = `GEMSTONE:${item.uuid ?? item.id ?? item.name}:${slot.id}:PERFECT`;
  return {
    id,
    domain: item.categories.includes("armor") || item.categories.some(category => ["helmet", "chestplate", "leggings", "boots"].includes(category)) ? "armor" : "tool",
    item: {
      id, name: `${operation} on ${item.name}`, rarity: item.rarity,
      categories: [...new Set([...item.categories, "item_upgrade", "gemstone_upgrade"])],
      stats: { [stat]: candidate }, lore: [], abilityText: [], setBonusText: [], requirements: [], unparsedRequirementText: [],
      wiki: null, marketKey: id, sources: { hypixel: true, neu: false },
    },
    price: priceCoins !== undefined ? {
      coins: priceCoins,
      observedAt: newestObservedAt([gemQuote, chamberQuote].filter((value): value is MarketQuote => Boolean(value))),
      confidence: [gemQuote, chamberQuote].filter(Boolean).some(value => value?.confidence === "LOW") ? "LOW"
        : [gemQuote, chamberQuote].filter(Boolean).some(value => value?.confidence === "MEDIUM") ? "MEDIUM" : "HIGH",
    } : undefined,
    knownChanges: { [stat]: { current, candidate } }, requirements: [], abilityText: [], setBonusText: [],
    warnings: [
      warning,
      priceKnown
        ? `Price estimate uses the current market snapshot for a Perfect ${gemstone} gemstone${slot.status === "LOCKED" ? " plus one Gemstone Chamber" : ""}.`
        : `Upgrade cost is incomplete because the market snapshot does not contain ${!gemQuote ? gemMarketId[gemstone] : "GEMSTONE_CHAMBER"}.`,
      "The stat delta is the direct gemstone contribution for this slot; it does not replace the item's other stats.",
      "This is an upgrade to an owned item, not a replacement-item recommendation.",
    ],
  };
}

function newestObservedAt(quotes: readonly MarketQuote[]) {
  return quotes.map(quote => quote.observedAt).sort().at(-1) ?? new Date(0).toISOString();
}
