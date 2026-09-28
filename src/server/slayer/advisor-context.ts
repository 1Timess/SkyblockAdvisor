import type { AdvisorDomainContext } from "../../schemas/advisor";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import type { NeuRepository } from "../reference/neu/repository";
import { parseItemRequirements } from "../reference/requirements";
import { buildSlayerResearchCatalog } from "./research-catalog";
import levelSnapshot from "../reference/slayer-level-rewards.json";
import dropSnapshot from "../reference/slayer-boss-drops.json";
import { buildCraftedMinions } from "../collections/progression";

const normalize = (value: string) => value.replace(/§./g, "").replace(/^[^\p{L}\p{N}]+/u, "").trim().toLowerCase();
const familyAliases: Record<string, string[]> = {
  zombie: ["zombie", "revenant", "atoned"], spider: ["spider", "tarantula", "primordial"],
  wolf: ["wolf", "sven"], enderman: ["enderman", "voidgloom", "eman"],
  blaze: ["blaze", "inferno", "demonlord"], vampire: ["vampire", "riftstalker", "bloodfiend"],
};

function optionNames(id: string, displayName: string) {
  const names = [displayName];
  const [base, suffix] = id.split(";");
  const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  if (suffix && /^\d+$/.test(suffix) && displayName.includes("Enchanted Book")) {
    names.push(`Enchanted Book (${base.replace(/^ULTIMATE_/, "").toLowerCase().split("_").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")} ${roman[Number(suffix)] ?? suffix})`);
  }
  if (id.startsWith("ENCHANTED_BOOK_BUNDLE_")) names.push(`Enchanted Book Bundle (${id.slice("ENCHANTED_BOOK_BUNDLE_".length).toLowerCase().replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase())})`);
  if (id === "WISP_POTION") names.push("Wisp's Ice-Flavored Water");
  return names;
}

export function buildSlayerAdvisorContext(profile: NormalizedSkyBlockProfile, question: string, neu: NeuRepository): AdvisorDomainContext {
  const byName = new Map<string, ReturnType<NeuRepository["getAll"]>>();
  for (const item of neu.getAll()) {
    if (!item.displayname) continue;
    const key = normalize(item.displayname);
    byName.set(key, [...(byName.get(key) ?? []), item]);
  }
  const findItem = (name: string) => {
    const found = byName.get(normalize(name)) ?? [];
    return found.length === 1 ? found[0] : null;
  };
  const text = question.toLowerCase();
  const wantsDrops = /\bdrops?\b|\brng\b|\bloot\b|\brewards?\b/.test(text);
  const familyMatch = Object.entries(familyAliases).filter(([, aliases]) => aliases.some(alias => text.includes(alias))).map(([id]) => id);
  const requestedLevel = Number(text.match(/\b(?:slayer\s*)?(?:level|lvl)\s*(\d)\b|\b(?:zombie|spider|wolf|enderman|blaze|vampire)\s+slayer\s+(\d)\b/)?.slice(1).find(Boolean));
  const catalog = buildSlayerResearchCatalog(profile);
  const families = catalog.map(family => ({ id: family.id, bossName: family.bossName, status: family.status,
    xp: family.xp, level: family.level, nextLevel: family.nextLevel, xpToNext: family.xpToNext,
    killsByTier: family.killsByTier, claimedRewardKeys: family.claimedRewardKeys }));
  const nextUnlocks = (id: string, level: number) =>
    (levelSnapshot.families[id as keyof typeof levelSnapshot.families].levels as Record<string, { unlocks: string[] }>)[String(level)]?.unlocks ?? [];
  const focusIds = familyMatch.length ? familyMatch : catalog.filter(family => family.nextLevel !== null && nextUnlocks(family.id, family.nextLevel).length > 0)
    .sort((a, b) => (a.xpToNext ?? Infinity) - (b.xpToNext ?? Infinity)).slice(0, 3).map(family => family.id);
  const unlockFocus = focusIds.flatMap(id => {
    const family = catalog.find(entry => entry.id === id)!;
    const levels = levelSnapshot.families[id as keyof typeof levelSnapshot.families].levels;
    const target = Number.isInteger(requestedLevel) && requestedLevel > 0 ? requestedLevel : family.nextLevel ?? (family.level === null ? 1 : null);
    if (target === null) return [];
    const row = levels[String(target) as keyof typeof levels];
    if (!row) return [];
    return row.unlocks.slice(0, 8).map(name => {
      const item = findItem(name), requirement = item && parseItemRequirements({ lore: item.lore, slayerRequirement: item.slayer_req })
        .requirements.find(value => value.kind === "SLAYER_LEVEL" && value.slayer === id);
      return { family: id, level: target, levelReached: family.level === null ? null : family.level >= target,
        name, itemId: item?.internalname ?? null,
        useRequirementLevel: requirement?.kind === "SLAYER_LEVEL" ? requirement.level : null };
    });
  }).slice(0, 16);
  const dropFocus = focusIds.flatMap(id => {
    const family = catalog.find(entry => entry.id === id)!;
    const drops = dropSnapshot.families[id as keyof typeof dropSnapshot.families].drops;
    return family.possibleRngRewards.map(option => {
      const item = neu.getById(option.neuId);
      const names = optionNames(option.neuId, item?.displayname?.replace(/§./g, "") ?? option.neuId).map(normalize);
      const match = drops.find(drop => names.includes(normalize(drop.name)));
      return { family: id, neuId: option.neuId, name: match?.name ?? item?.displayname?.replace(/§./g, "") ?? option.neuId,
        conditions: match?.conditions ?? [], conditionStatus: match ? "SOURCED" as const : "UNRESOLVED" as const };
    }).filter(drop => drop.conditionStatus === "SOURCED" && (wantsDrops || family.level === null || drop.conditions.some(c => c.slayerLevel > family.level!) || normalize(drop.name).split(" ").some(word => word.length > 4 && text.includes(word))));
  }).sort((a, b) => {
    const hit = (name: string) => normalize(name).split(" ").some(word => word.length > 4 && text.includes(word));
    return Number(hit(b.name)) - Number(hit(a.name)) || Math.min(...a.conditions.map(c => c.slayerLevel)) - Math.min(...b.conditions.map(c => c.slayerLevel));
  }).slice(0, 8);
  const totalUnlocks = Object.values(levelSnapshot.families).reduce((sum, family) => sum + Object.values(family.levels).reduce((count, row) => count + row.unlocks.length, 0), 0);
  const craftedSlayerMinions = buildCraftedMinions(profile.craftedGenerators)
    .filter(minion => ["REVENANT", "TARANTULA", "VOIDLING", "INFERNO"].includes(minion.id));
  return { domain: "SLAYER", families, focusFamilies: focusIds, totalLevelUnlocks: totalUnlocks,
    totalBossDrops: Object.values(dropSnapshot.families).reduce((sum, family) => sum + family.drops.length, 0),
    possibleRngOptionCount: catalog.reduce((sum, family) => sum + family.possibleRngRewards.length, 0),
    unlockFocus, dropFocus, craftedSlayerMinions,
    note: "For a general progression question, focusFamilies shows the nearest XP thresholds with sourced direct unlocks; XP distance does not estimate effort or value. Level unlocks, item use requirements, boss drop conditions, and possible RNG selections are separate evidence. Boss tiers in dropFocus indicate eligible drop tables, not proven fight access, ownership, probability, or farming value. Claimed reward keys are literal API keys; absent keys do not prove an unclaimed reward. Crafted minion tiers are historical observations, not placed minions. No RNG meter progress, active quest, drop inventory, recipe ingredients, or boss kill time is supplied. Item IDs in unlockFocus are references, not BUY candidates." };
}
