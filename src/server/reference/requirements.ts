import type { CandidateItem, ItemRequirement, RequirementCheck } from "../../schemas/catalog";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { stripFormatting } from "../skyblock/items/parse-footer";

const slayerAliases: Record<string, string> = { EMAN: "enderman", ENDERMAN: "enderman", REVENANT: "zombie", ZOMBIE: "zombie", TARANTULA: "spider", SPIDER: "spider", SVEN: "wolf", WOLF: "wolf", BLAZE: "blaze", VAMPIRE: "vampire" };
const romanValues: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };

export function romanToNumber(value: string): number | null {
  const input = value.toUpperCase();
  if (!/^[IVXLC]+$/.test(input)) return null;
  let total = 0, previous = 0;
  for (const char of [...input].reverse()) {
    const current = romanValues[char];
    total += current < previous ? -current : current; previous = current;
  }
  return total > 0 && total <= 100 ? total : null;
}

export function normalizeRequirementText(raw: string) {
  return stripFormatting(raw).replace(/^[❣☠]\s*/, "").trim().replace(/\.$/, "");
}

export function parseRequirementText(raw: string): ItemRequirement | null {
  const sourceText = normalizeRequirementText(raw);
  let match = sourceText.match(/^Requires (Combat|Fishing|Farming|Mining|Foraging|Enchanting|Alchemy|Taming) Skill (\d+)$/i);
  if (match) return { kind: "SKILL_LEVEL", skill: match[1].toLowerCase(), level: Number(match[2]), sourceText };
  match = sourceText.match(/^Requires (Enderman|Spider|Zombie|Wolf|Blaze|Vampire) Slayer (\d+)$/i);
  if (match) return { kind: "SLAYER_LEVEL", slayer: match[1].toLowerCase(), level: Number(match[2]), sourceText };
  match = sourceText.match(/^Requires Catacombs Skill (\d+)$/i);
  if (match) return { kind: "DUNGEON_LEVEL", level: Number(match[1]), sourceText };
  match = sourceText.match(/^Requires The Catacombs Floor ([IVXLC]+) Completion$/i);
  if (match) { const floor = romanToNumber(match[1]); if (floor !== null) return { kind: "DUNGEON_FLOOR", floor, sourceText }; }
  match = sourceText.match(/^Requires Heart of the Mountain Tier (\d+)$/i);
  if (match) return { kind: "HEART_OF_THE_MOUNTAIN", tier: Number(match[1]), sourceText };
  match = sourceText.match(/^Requires Garden Level (\d+)$/i);
  if (match) return { kind: "GARDEN_LEVEL", level: Number(match[1]), sourceText };
  return null;
}

function parseSlayerField(value?: string): ItemRequirement | null {
  const match = value?.match(/^([A-Z]+)_(\d+)$/);
  const slayer = match ? slayerAliases[match[1]] : undefined;
  return match && slayer ? { kind: "SLAYER_LEVEL", slayer, level: Number(match[2]), sourceText: `slayer_req:${value}` } : null;
}

export function parseItemRequirements(input: { lore?: readonly string[]; slayerRequirement?: string }) {
  const requirements: ItemRequirement[] = [], unparsedRequirementText: string[] = [];
  const add = (requirement: ItemRequirement) => {
    const key = JSON.stringify({ ...requirement, sourceText: undefined });
    if (!requirements.some(existing => JSON.stringify({ ...existing, sourceText: undefined }) === key)) requirements.push(requirement);
  };
  const slayer = parseSlayerField(input.slayerRequirement); if (slayer) add(slayer);
  for (const raw of input.lore ?? []) {
    const normalized = normalizeRequirementText(raw);
    if (!/^Requires\b/i.test(normalized)) continue;
    const parsed = parseRequirementText(normalized);
    if (parsed) add(parsed); else if (!unparsedRequirementText.includes(normalized)) unparsedRequirementText.push(normalized);
  }
  return { requirements, unparsedRequirementText };
}

export function checkItemRequirements(item: Pick<CandidateItem, "requirements">, profile: NormalizedSkyBlockProfile): RequirementCheck[] {
  return item.requirements.map(requirement => {
    let actual: number | null = null;
    if (requirement.kind === "SKILL_LEVEL") actual = profile.progression.skills[requirement.skill]?.level ?? null;
    if (requirement.kind === "SLAYER_LEVEL") actual = profile.progression.slayers[requirement.slayer]?.level ?? null;
    if (requirement.kind === "DUNGEON_LEVEL") actual = profile.progression.dungeons.catacombs?.level ?? null;
    if (requirement.kind === "DUNGEON_FLOOR") actual = profile.progression.dungeons.highestFloorNormal;
    if (requirement.kind === "HEART_OF_THE_MOUNTAIN") actual = profile.progression.mining.hotmLevel;
    const required = "tier" in requirement ? requirement.tier : "floor" in requirement ? requirement.floor : requirement.level;
    return { requirement, actual, status: actual === null ? "UNKNOWN" as const : actual >= required ? "MET" as const : "NOT_MET" as const };
  });
}
