import type { RawMember } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";
import type { LevelProgress } from "../../../schemas/progression";
import { levelFromXp } from "../../reference/leveling";
import tables from "../../reference/xp-tables.json";
import rngRequirements from "../../reference/dungeon-rng-scores.json";

type DungeonRun = NonNullable<NonNullable<RawMember["dungeons"]>["dungeon_types"]>["catacombs"];
function getFloorRecords(run: DungeonRun) {
  const fields = ["tier_completions","times_played","best_score","fastest_time","fastest_time_s","fastest_time_s_plus","mobs_killed","most_mobs_killed"] as const;
  const floorKey = (key:string) => key.replace(/^tier_([1-7])$/, "$1");
  const keys = new Set(fields.flatMap(field => Object.keys(run?.[field] ?? {}).map(floorKey)));
  const get = (field: typeof fields[number], floor: string) =>
    run?.[field]?.[floor] ?? run?.[field]?.[`tier_${floor}`] ?? null;
  return Object.fromEntries([...keys].map(floor => [floor, {
    completions:get("tier_completions",floor), runsPlayed:get("times_played",floor),
    bestScore:get("best_score",floor), fastestTimeMs:get("fastest_time",floor),
    fastestSTimeMs:get("fastest_time_s",floor), fastestSPlusTimeMs:get("fastest_time_s_plus",floor),
    mobsKilled:get("mobs_killed",floor), mostMobsKilled:get("most_mobs_killed",floor),
  }]));
}
export const dungeonBossCollections = [
  { floor: "1", name: "Bonzo", milestones: [25, 50, 100, 150, 250, 1000] },
  { floor: "2", name: "Scarf", milestones: [25, 50, 100, 150, 250, 1000] },
  { floor: "3", name: "The Professor", milestones: [25, 50, 100, 150, 250, 1000] },
  { floor: "4", name: "Thorn", milestones: [50, 100, 150, 250, 400, 1000] },
  { floor: "5", name: "Livid", milestones: [50, 100, 150, 250, 500, 750, 1000] },
  { floor: "6", name: "Sadan", milestones: [50, 100, 150, 250, 500, 750, 1000] },
  { floor: "7", name: "Necron", milestones: [50, 100, 150, 250, 500, 750, 1000] },
] as const;

// Boss Collection thresholds: SkyCrypt-Backend src/constants/collections.go.
// Claims are not inferred from completed runs.
export function buildDungeonBossCollections(
  normal?: Record<string, number>, master?: Record<string, number>,
  tutorialFlags?: string[],
) {
  const claimed = new Set((tutorialFlags ?? []).filter(flag => flag.startsWith("boss_collection_claimed_")));
  return dungeonBossCollections.map(boss => {
    const normalCount = normal?.[boss.floor] ?? normal?.[`tier_${boss.floor}`] ?? null;
    const masterCount = master?.[boss.floor] ?? master?.[`tier_${boss.floor}`] ?? null;
    // Hypixel counts a Master Mode completion twice for boss collections.
    const total = normalCount === null && masterCount === null ? null : (normalCount ?? 0) + 2 * (masterCount ?? 0);
    const tier = total === null ? null : boss.milestones.filter(value => total >= value).length;
    const next = tier === null ? null : (boss.milestones[tier] ?? null);
    return {
      floor: boss.floor, name: boss.name, total, normal: normalCount, master: masterCount,
      tier, maxTier: boss.milestones.length, nextMilestone: next,
      progress: total === null || next === null ? null : Math.min(total / next, 1),
      // Observed claimed entries are evidence of claims; missing flags are not proof of an unclaimed reward.
      claimedFlags: [...claimed].filter(flag => flag.startsWith(`boss_collection_claimed_${boss.name.toLowerCase().replace(/[^a-z]/g, "")}_`)).sort(),
    };
  });
}

// Source: NotEnoughUpdates-REPO/constants/rngscore.json (snapshot).
// This is static reward requirement data, NOT a player's stored Dungeon Score.
export const dungeonRngRequirements: Record<string, Record<string, number>> = rngRequirements;
export function dungeonRngRewards(mode: "normal" | "master", floor: string) {
  const key = `${mode === "master" ? "M" : "F"}${floor}`;
  return Object.entries(dungeonRngRequirements[key] ?? {}).map(([itemId, requiredScore]) => ({
    itemId, requiredScore,
  })).sort((a, b) => b.requiredScore - a.requiredScore || a.itemId.localeCompare(b.itemId));
}

export function buildDungeons(member: RawMember, warnings: ProfileWarning[]) {
  const dungeon = member.dungeons;
  const normal = dungeon?.dungeon_types?.catacombs, master = dungeon?.dungeon_types?.master_catacombs;
  if (!dungeon) warnings.push({ code: "PARTIAL_PROFILE", scope: "dungeons", message: "Dungeon data was not supplied." });
  const classes: Record<string, LevelProgress> = {};
  for (const [name, raw] of Object.entries(dungeon?.player_classes ?? {})) {
    if (raw.experience !== undefined) classes[name] = levelFromXp(raw.experience, tables.dungeoneering, 50, true);
  }
  const levels = Object.values(classes);
  return {
    catacombs: normal?.experience === undefined ? null : levelFromXp(normal.experience, tables.dungeoneering, 50, true),
    selectedClass: dungeon?.selected_dungeon_class ?? null, classes,
    classAverage: levels.length ? levels.reduce((sum, value) => sum + value.level, 0) / levels.length : null,
    floorCompletions: { normal: normal?.tier_completions ?? {}, master: master?.tier_completions ?? {} },
    floorRecords: { normal: getFloorRecords(normal), master: getFloorRecords(master) },
    bossCollections: buildDungeonBossCollections(normal?.tier_completions, master?.tier_completions, member.objectives?.tutorial),
    highestFloorNormal: normal?.highest_tier_completed ?? null, highestFloorMaster: master?.highest_tier_completed ?? null,
    ...(dungeon?.secrets !== undefined ? { secretsFound: dungeon.secrets } : {}),
  };
}
