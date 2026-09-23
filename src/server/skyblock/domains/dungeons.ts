import type { RawMember } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";
import type { LevelProgress } from "../../../schemas/progression";
import { levelFromXp } from "../../reference/leveling";
import tables from "../../reference/xp-tables.json";

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
    highestFloorNormal: normal?.highest_tier_completed ?? null, highestFloorMaster: master?.highest_tier_completed ?? null,
    ...(dungeon?.secrets !== undefined ? { secretsFound: dungeon.secrets } : {}),
  };
}
