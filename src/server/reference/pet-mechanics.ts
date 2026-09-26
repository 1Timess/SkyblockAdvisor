import type { NeuItem } from "../../schemas/neu";
import type { NeuPetConstants } from "../../schemas/neu-pets";
import {
  canonicalPetDefinitionSchema, canonicalPetItemDefinitionSchema,
  type CanonicalPetDefinition, type CanonicalPetItemDefinition,
  type PetAbilityMechanic, type PetCondition, type PetEffect,
} from "../../schemas/pet-mechanics";
import { stripFormatting } from "../skyblock/items/parse-footer";

const rarities = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"] as const;
const statNames = [
  "MINING_SPEED", "MINING_FORTUNE", "GEMSTONE_FORTUNE", "PRISTINE", "STRENGTH", "MAGIC_FIND",
  "BONUS_ATTACK_SPEED", "HEALTH", "DEFENSE", "INTELLIGENCE", "SPEED", "FEROCITY", "CRIT_CHANCE",
  "CRIT_DAMAGE", "FARMING_FORTUNE", "FORAGING_FORTUNE", "BLOCK_FORTUNE", "HEAT_RESISTANCE",
];

export function buildCanonicalPetDefinitions(items: readonly NeuItem[], constants: NeuPetConstants): CanonicalPetDefinition[] {
  return items.flatMap(item => {
    const match = item.internalname.match(/^(.+);([0-5])$/);
    if (!match || !isNeuPetDefinition(item)) return [];
    const tier = Number(match[2]), type = match[1], rarity = rarities[tier];
    if (!rarity) return [];
    const custom = constants.custom_pet_leveling[type];
    const maxLevel = custom?.max_level ?? 100;
    const rarityOffset = custom?.rarity_offset?.[rarity] ?? constants.pet_rarity_offset[rarity] ?? null;
    const curve = resolveXpCurve(constants.pet_levels, custom?.pet_levels, maxLevel, rarityOffset, custom?.xp_multiplier ?? 1);
    const cleanLore = (item.lore ?? []).map(stripFormatting);
    const baseStatTemplates = parseBaseStatTemplates(cleanLore);
    return [canonicalPetDefinitionSchema.parse({
      id: item.internalname, type, rarity: rarity.toLowerCase(), petSkillType: constants.pet_types[type] ?? null,
      maxLevel, rarityOffset, xpCurve: curve, xpMultiplier: custom?.xp_multiplier ?? 1, customLevelingType: custom?.type ?? null, baseStatTemplates,
      abilities: parsePetAbilities(item.lore ?? []), upgradePaths: parseKatPaths(item), source: "NEU",
    })];
  });
}

function isNeuPetDefinition(item: NeuItem) {
  // TYPE;TIER is NEU's pet-definition identity. Keep lore/NBT as corroboration, not a requirement:
  // some valid pets are mounts, while focused fixtures may intentionally contain only the mechanic under test.
  if (!/^.+;[0-5]$/.test(item.internalname)) return false;
  const lore = (item.lore ?? []).map(stripFormatting);
  if (lore.some(line => /(?:Pet|Mount)\s*$/i.test(line.trim()))) return true;
  if (lore.some(line => /Right-click to add this pet to your pet menu!/i.test(line))) return true;
  if (/petInfo:/.test(String((item as unknown as Record<string, unknown>).nbttag ?? ""))) return true;
  // Canonical pet fixtures and incomplete NEU records still use TYPE;TIER. Downstream schema parsing remains fail-soft.
  return true;
}

export function buildCanonicalPetItemDefinitions(items: readonly NeuItem[], constants: NeuPetConstants): CanonicalPetItemDefinition[] {
  const mappedIds = new Set(Object.values(constants.pet_item_display_name_to_id));
  return items.filter(item => mappedIds.has(item.internalname) || isNeuPetItem(item)).map(item => {
    const rawLore = (item.lore ?? []).map(stripFormatting).filter(Boolean);
    const parsed = parseMechanic(rawLore);
    return canonicalPetItemDefinitionSchema.parse({
      itemId: item.internalname, rawLore, effects: parsed.effects, conditions: parsed.conditions,
      parseStatus: parsed.status, confidence: parsed.confidence, source: "NEU",
    });
  });
}


function isNeuPetItem(item: NeuItem) {
  const lore = (item.lore ?? []).map(stripFormatting);
  return lore.some(line => /^\s*(?:COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|MYTHIC) PET ITEM\s*$/.test(line.trim())) ||
    lore.some(line => /Pet Items can boost pets/i.test(line));
}

export function parsePetAbilities(rawLore: readonly string[]): PetAbilityMechanic[] {
  const result: PetAbilityMechanic[] = [];
  let name: string | null = null, lines: string[] = [];
  const flush = () => {
    if (!name) return;
    const parsed = parseMechanic(lines);
    result.push({ name, rawLore: [...lines], effects: parsed.effects, conditions: parsed.conditions,
      parseStatus: parsed.status, confidence: parsed.confidence });
  };
  for (const raw of rawLore) {
    const clean = stripFormatting(raw).trim();
    if (/^§6/.test(raw) && clean && !/^(?:LEGENDARY|MYTHIC|EPIC|RARE|UNCOMMON|COMMON)\b/.test(clean)) {
      flush(); name = clean; lines = [];
    } else if (name && clean) lines.push(clean);
    else if (name && !clean) { flush(); name = null; lines = []; }
  }
  flush();
  return result;
}

function parseMechanic(lines: readonly string[]) {
  const text = lines.join(" ");
  const effects: PetEffect[] = [];
  const conditions: PetCondition[] = [];
  for (const stat of statNames) {
    const label = stat.replaceAll("_", " ");
    const regex = new RegExp(`(?:\\+)?(?:\\{\\d+\\}|\\{[A-Z_]+\\}|[\\d.]+)%?\\s*${label}`, "i");
    if (regex.test(text.replaceAll("☘", "").replaceAll("", "").replaceAll("", "").replaceAll("", ""))) {
      effects.push({ kind: /per (?:pet )?levels?|every \d+ pet levels?/i.test(text) ? "SCALED_STAT" : "FLAT_STAT",
        target: stat, valueTemplate: matchedValue(text, label), rawText: text });
    }
  }
  if (/chance to (?:find|drop|obtain)/i.test(text)) effects.push({ kind: "DROP_CHANCE", target: null, valueTemplate: firstTemplate(text), rawText: text });
  if (/increase(?:s)? .* (?:drops?|resources?|powder)/i.test(text)) effects.push({ kind: "RESOURCE_MULTIPLIER", target: resourceTarget(text), valueTemplate: firstTemplate(text), rawText: text });
  if (/convert|for every .* gain/i.test(text)) effects.push({ kind: "CONVERSION", target: resourceTarget(text), valueTemplate: firstTemplate(text), rawText: text });
  if (/exp|experience/i.test(text) && /boost|increase|gain/i.test(text)) effects.push({ kind: "XP_MULTIPLIER", target: resourceTarget(text), valueTemplate: firstTemplate(text), rawText: text });
  if (/minion/i.test(text)) effects.push({ kind: "MINION_MODIFIER", target: null, valueTemplate: firstTemplate(text), rawText: text });
  if (/ability/i.test(text) && /increase|boost|reduce/i.test(text)) effects.push({ kind: "ABILITY_MODIFIER", target: null, valueTemplate: firstTemplate(text), rawText: text });
  conditions.push(...parseConditions(text));
  const recognized = effects.length + conditions.length;
  return {
    effects, conditions,
    status: recognized === 0 ? "UNPARSED" as const : hasUnresolvedSemantics(text, effects) ? "PARTIAL" as const : "FULL" as const,
    confidence: recognized === 0 ? "LOW" as const : hasUnresolvedSemantics(text, effects) ? "MEDIUM" as const : "HIGH" as const,
  };
}

function parseConditions(text: string): PetCondition[] {
  const out: PetCondition[] = [];
  const add = (kind: PetCondition["kind"], value: string, rawText = text) => out.push({ kind, value, rawText });
  const location = text.match(/(?:while|when) (?:in|on) (?:the )?([A-Z][A-Za-z ]+?)(?:,|\.| killing| mining| gain| grants|$)/);
  if (location) add("LOCATION", location[1].trim());
  const equipment = text.match(/(?:to|with) (Drills?|Axes?|Swords?|Bows?|Fishing Rods?)/i);
  if (equipment) add("EQUIPMENT_TYPE", equipment[1].toUpperCase());
  const collection = text.match(/(?:in|your) ([A-Z][A-Za-z ]+) Collection/i);
  if (collection) add("COLLECTION", collection[1].trim());
  if (/if you own|that you own/i.test(text) && /pet/i.test(text)) add("OWNED_PETS", "OWNERSHIP_DEPENDENT");
  if (/current (?:Mineshaft|run|session)/i.test(text)) add("RUN_STATE", "CURRENT_RUN");
  if (/killing|against|damage dealt to/i.test(text)) add("MOB_TYPE", "MOB_DEPENDENT");
  return out;
}

function parseKatPaths(item: NeuItem) {
  return (item.recipes ?? []).flatMap(recipe => {
    if (!recipe || typeof recipe !== "object") return [];
    const r = recipe as Record<string, unknown>;
    if (r.type !== "katgrade" || typeof r.input !== "string" || typeof r.output !== "string") return [];
    const itemCosts = Array.isArray(r.items) ? r.items.flatMap(value => {
      if (typeof value !== "string") return [];
      const [itemId, rawCount] = value.split(":");
      const count = Number(rawCount ?? "1");
      return itemId && Number.isFinite(count) && count > 0 ? [{ itemId, count }] : [];
    }) : [];
    return [{ operation: "KAT" as const, inputId: r.input, outputId: r.output,
      coins: typeof r.coins === "number" ? r.coins : null, timeSeconds: typeof r.time === "number" ? r.time : null, itemCosts }];
  });
}

function matchedValue(text: string, label: string) {
  const match = text.match(new RegExp(`(\\{\\d+\\}|\\{[A-Z_]+\\}|[\\d.]+)%?[^.]{0,24}${label}`, "i"));
  return match?.[1] ?? null;
}
function firstTemplate(text: string) { return text.match(/\{\d+\}|\{[A-Z_]+\}|[+-]?\d+(?:\.\d+)?%/)?.[0] ?? null; }
function resourceTarget(text: string) {
  for (const value of ["Gemstone Powder", "Mithril Powder", "Mining Fortune", "Block Fortune", "Pristine", "Coins"]) if (text.toLowerCase().includes(value.toLowerCase())) return value.toUpperCase().replaceAll(" ", "_");
  return null;
}
function hasUnresolvedSemantics(text: string, effects: readonly PetEffect[]) {
  if (!effects.length) return true;
  return /for each|for every|depending|based on|current|per .*collection|up to|max |if |while |when /i.test(text);
}

function resolveXpCurve(base: readonly number[], custom: readonly number[] | undefined, maxLevel: number, rarityOffset: number | null, xpMultiplier: number) {
  const offset = rarityOffset ?? 0;
  const normalLevels = Math.min(maxLevel - 1, 99);
  const normal = base.slice(offset, offset + normalLevels).map(value => value * xpMultiplier);
  if (maxLevel <= 100) return normal;
  const extraNeeded = maxLevel - 1 - normal.length;
  return [...normal, ...(custom ?? []).slice(0, extraNeeded).map(value => value * xpMultiplier)];
}
function parseBaseStatTemplates(lore: readonly string[]) {
  const out: Record<string, string> = {};
  for (const line of lore) {
    const match = line.match(/^([A-Za-z ]+):\s*\+?((?:\{[A-Z_]+\})|(?:-?\d+(?:\.\d+)?))(?:%|$)/);
    if (!match) continue;
    out[match[1].trim().toUpperCase().replaceAll(" ", "_")] = match[2];
  }
  return out;
}
