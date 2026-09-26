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
    if (!match || !(item.lore ?? []).some(line => stripFormatting(line).trim().endsWith(" Pet"))) return [];
    const tier = Number(match[2]), type = match[1], rarity = rarities[tier];
    if (!rarity) return [];
    const custom = constants.custom_pet_leveling[type];
    const maxLevel = custom?.max_level ?? 100;
    const curve = resolveXpCurve(constants.pet_levels, custom?.pet_levels, maxLevel);
    const rarityOffset = custom?.rarity_offset?.[rarity] ?? constants.pet_rarity_offset[rarity] ?? null;
    const cleanLore = (item.lore ?? []).map(stripFormatting);
    const baseStatTemplates = parseBaseStatTemplates(cleanLore);
    return [canonicalPetDefinitionSchema.parse({
      id: item.internalname, type, rarity: rarity.toLowerCase(), petSkillType: constants.pet_types[type] ?? null,
      maxLevel, rarityOffset, xpCurve: curve, xpMultiplier: custom?.xp_multiplier ?? 1, customLevelingType: custom?.type ?? null, baseStatTemplates,
      abilities: parsePetAbilities(item.lore ?? []), upgradePaths: parseKatPaths(item), source: "NEU",
    })];
  });
}

export function buildCanonicalPetItemDefinitions(items: readonly NeuItem[], constants: NeuPetConstants): CanonicalPetItemDefinition[] {
  const ids = new Set(Object.values(constants.pet_item_display_name_to_id));
  return items.filter(item => ids.has(item.internalname)).map(item => {
    const rawLore = (item.lore ?? []).map(stripFormatting).filter(Boolean);
    const parsed = parseMechanic(rawLore);
    return canonicalPetItemDefinitionSchema.parse({
      itemId: item.internalname, rawLore, effects: parsed.effects, conditions: parsed.conditions,
      parseStatus: parsed.status, confidence: parsed.confidence, source: "NEU",
    });
  });
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

function resolveXpCurve(base: readonly number[], custom: readonly number[] | undefined, maxLevel: number) {
  if (maxLevel <= 100) return [...(custom ?? base)].slice(0, maxLevel);
  if (!custom?.length) return [...base].slice(0, maxLevel);
  // NEU custom level-200 pets provide the additional 101-200 costs separately from the normal curve.
  return [...base.slice(0, 100), ...custom].slice(0, maxLevel);
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
