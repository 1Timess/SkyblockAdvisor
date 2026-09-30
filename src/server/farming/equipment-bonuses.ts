import { stripFormatting } from "../skyblock/items/parse-footer";

/** Quantify only values actually present in the supplied tooltip; never reconstruct scaling from global visitor totals. */
export function farmingBonusMechanics(rawLore: readonly string[], evidence: "OBSERVED_TOOLTIP" | "CATALOG_TEMPLATE") {
  const lines = rawLore.map(stripFormatting), text = lines.join(" ").replace(/\s+/g, " ");
  const visitor = /Piece Bonus: (Salesperson|Florist)/.exec(text);
  const bonus = /Piece Bonus: \+([\d.]+)[^\d]/.exec(text);
  const next = /Next Upgrade: \+([\d.]+).*?\(([\d,]+)\/([\d,]+)\)/.exec(text);
  const tiered = /Tiered Bonus: ([^(]+)\((\d)\/4\)/.exec(text);
  const fortune = /Grants \+?([\d.]+)[^\d]*Farming Fortune/.exec(text);
  const pest = /Bonus Pest Chance: \+([\d.]+)%/.exec(text);
  const rates = [...text.matchAll(/([\d.]+)%\s*chance/gi)].map(match => Number(match[1]));
  return {
    evidence,
    visitorBonus: visitor ? { name: visitor[1], displayedFortune: bonus ? Number(bonus[1]) : null,
      nextFortuneIncrement: next ? Number(next[1]) : null,
      displayedOffersProgress: next ? Number(next[2].replaceAll(",", "")) : null,
      displayedOffersRequired: next ? Number(next[3].replaceAll(",", "")) : null,
      remainingOffers: next ? Math.max(0, Number(next[3].replaceAll(",", "")) - Number(next[2].replaceAll(",", ""))) : null } : null,
    tieredBonus: tiered ? { name: tiered[1].trim(), displayedPieceCount: Number(tiered[2]),
      displayedFortune: fortune ? Number(fortune[1]) : null, displayedDropChancePercent: rates,
      effectText: lines.filter(line => line.trim()).join(" ") } : null,
    displayedPestChancePercent: pest ? Number(pest[1]) : null,
    note: evidence === "CATALOG_TEMPLATE" ? "Template preview only: counts, visitor progress and conditional rates are not player state or a verified piece-count table."
      : "Observed tooltip snapshot only: item location does not establish current equipped state; rates and bonuses retain their displayed crop, location and set conditions.",
  };
}
