import type { NeuItem } from "../../schemas/neu";
import type { NeuRepository } from "../reference/neu/repository";
import { stripFormatting } from "../skyblock/items/parse-footer";

export const RUNECRAFTING_CAP = 25;
export const DEFAULT_RANK_CAP = 3;

export const runecraftingRankMechanics = [
  { rank: "DEFAULT", cap: 3, xpMultiplier: 1 },
  { rank: "VIP", cap: 25, xpMultiplier: 1.1 },
  { rank: "VIP_PLUS", cap: 25, xpMultiplier: 1.25 },
  { rank: "MVP", cap: 25, xpMultiplier: 1.5 },
  { rank: "MVP_PLUS", cap: 25, xpMultiplier: 2 },
  { rank: "MVP_PLUS_PLUS", cap: 25, xpMultiplier: 3 },
] as const;

export const runecraftingMechanics = {
  purpose: "Cosmetic skill used to unlock and apply rune cosmetics.",
  xpSources: ["Runic mobs", "supported bosses", "rune fusion attempts"],
  pedestal: "The Runic Pedestal is used to apply runes to compatible items and to fuse runes.",
  runeTiers: [1, 2, 3],
  note: "Rune tier and Runecrafting level requirement are separate properties.",
} as const;

export interface RuneReference {
  id: string;
  name: string;
  tier: number | null;
  runecraftingLevelRequired: number | null;
  applicableTo: string | null;
  lore: string[];
  source: "NEU_LORE";
}

function parseTier(item: NeuItem, lore: readonly string[]) {
  const text = [item.internalname, item.displayname ?? "", ...lore].join(" ");
  const match = text.match(/(?:RUNE[_ ]|TIER\s+)(I{1,3}|[123])\b/i);
  if (!match) return null;
  const raw = match[1].toUpperCase();
  return raw === "I" ? 1 : raw === "II" ? 2 : raw === "III" ? 3 : Number(raw);
}

function parseRequirement(lore: readonly string[]) {
  for (const line of lore) {
    const match = line.match(/(?:requires?|requirement:?)[^\d]*runecrafting[^\d]*(\d+)/i)
      ?? line.match(/runecrafting\s+(\d+)/i);
    if (match) return Number(match[1]);
  }
  return null;
}

function parseApplicableTo(lore: readonly string[]) {
  for (const line of lore) {
    const match = line.match(/(?:apply|applicable|can be applied)\s+(?:this rune\s+)?to\s+(?:an?\s+)?(.+?)(?:\.|$)/i);
    if (match) return match[1].trim();
  }
  return null;
}

export function isRuneItem(item: NeuItem) {
  const text = `${item.internalname} ${item.displayname ?? ""}`;
  return /(?:^|[_ ])RUNE(?:$|[_ ])/i.test(text);
}

export function parseRuneReference(item: NeuItem): RuneReference | null {
  if (!isRuneItem(item)) return null;
  const lore = (item.lore ?? []).map(stripFormatting);
  return {
    id: item.internalname,
    name: stripFormatting(item.displayname ?? item.internalname),
    tier: parseTier(item, lore),
    runecraftingLevelRequired: parseRequirement(lore),
    applicableTo: parseApplicableTo(lore),
    lore,
    source: "NEU_LORE",
  };
}

export function buildRuneCatalog(neu?: NeuRepository) {
  if (!neu) return [] as RuneReference[];
  return neu.getAll().map(parseRuneReference).filter((value): value is RuneReference => value !== null);
}
