import type { RawMember } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";
import type { LevelProgress } from "../../../schemas/progression";
import { levelFromXp } from "../../reference/leveling";
import tables from "../../reference/xp-tables.json";

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
    highestFloorNormal: normal?.highest_tier_completed ?? null, highestFloorMaster: master?.highest_tier_completed ?? null,
    ...(dungeon?.secrets !== undefined ? { secretsFound: dungeon.secrets } : {}),
  };
}
