import type { ProcessedItem, ProfileItem, ProfileWarning } from "../../../schemas/items";
import { parseFooter, stripFormatting } from "./parse-footer";
import { extractStats } from "./parse-stats";

export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown): string | null { return typeof value === "string" ? value : null; }
function numeric(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }

export function extractAbilityText(lore: string[]) {
  const abilityText: string[] = [], setBonusText: string[] = [];
  let target: string[] | null = null;
  for (const line of lore) {
    if (/^(?:Item )?Ability:/i.test(line)) target = abilityText;
    else if (/^(?:Full Set Bonus|Piece Bonus|Tiered Bonus):/i.test(line)) target = setBonusText;
    else if (!line.trim() || /^(?:COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|MYTHIC|DIVINE|SPECIAL|VERY SPECIAL)\b/.test(line)) target = null;
    if (target) target.push(line);
  }
  return { abilityText, setBonusText };
}

export function processItem(raw: unknown, source: string, slotIndex: number, warnings: ProfileWarning[]): ProcessedItem | null {
  const item = object(raw), tag = object(item.tag), extra = object(tag.ExtraAttributes), display = object(tag.display);
  const rawLore = Array.isArray(display.Lore) ? display.Lore.filter((x): x is string => typeof x === "string") : [];
  const id = text(extra.id), name = text(display.Name);
  if (!id && !name && !rawLore.length) return null;
  const cleanLore = rawLore.map(stripFormatting);
  const { rarity, categories } = parseFooter(cleanLore);
  const { stats, unknown } = extractStats(cleanLore);
  if (!categories.length) warnings.push({ code: "UNKNOWN_ITEM_CATEGORY", scope: source, message: `Category unknown for ${id ?? stripFormatting(name ?? "item")}; lore retained.` });
  if (unknown.length) warnings.push({ code: "UNKNOWN_ITEM_STAT", scope: source, message: `Unmapped stat labels on ${id ?? "item"}: ${[...new Set(unknown)].join(", ")}.` });
  const enchantments = Object.fromEntries(Object.entries(object(extra.enchantments)).filter((entry): entry is [string, number] => numeric(entry[1]) !== null));
  return {
    id, uuid: text(extra.uuid), name: stripFormatting(name ?? id ?? "Unknown item"),
    count: Math.max(0, Math.floor(numeric(item.Count) ?? 1)), rarity, categories, stats,
    reforge: text(extra.modifier), enchantments, stars: numeric(extra.upgrade_level) ?? numeric(extra.dungeon_item_level),
    recombobulated: (numeric(extra.rarity_upgrades) ?? 0) > 0,
    lore: cleanLore, ...extractAbilityText(cleanLore), source, slotIndex, rawLore, cleanLore, extraAttributes: extra,
  };
}

export function toProfileItem(item: ProcessedItem): ProfileItem {
  return {
    id: item.id, uuid: item.uuid, name: item.name, count: item.count, rarity: item.rarity, categories: item.categories,
    stats: item.stats, reforge: item.reforge, enchantments: item.enchantments, stars: item.stars, recombobulated: item.recombobulated,
    lore: item.lore, abilityText: item.abilityText, setBonusText: item.setBonusText, source: item.source,
  };
}
