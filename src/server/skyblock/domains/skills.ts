import type { RawMember } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";
import type { LevelProgress } from "../../../schemas/progression";
import { levelFromXp } from "../../reference/leveling";
import xpTables from "../../reference/xp-tables.json";

const caps: Record<string, number> = { farming: 50, mining: 60, combat: 60, foraging: 50, fishing: 50,
  enchanting: 60, alchemy: 50, taming: 50, carpentry: 50, runecrafting: 25, social: 25, hunting: 50 };

export function buildSkills(member: RawMember, warnings: ProfileWarning[]) {
  const skills: Record<string, LevelProgress> = {};
  const experience = member.player_data?.experience;
  if (!experience) warnings.push({ code: "API_DATA_DISABLED", scope: "skills", message: "Skill XP was not supplied; unavailable levels are omitted." });
  for (const [skill, baseCap] of Object.entries(caps)) {
    const xp = experience?.[`SKILL_${skill.toUpperCase()}`];
    if (xp === undefined) continue;
    const bonus = skill === "farming" ? member.jacobs_contest?.perks?.farming_level_cap ?? 0
      : skill === "taming" ? member.pets_data?.pet_care?.pet_types_sacrificed?.length ?? 0 : 0;
    const cap = Math.min(60, baseCap + Math.floor(bonus));
    const costs = skill === "runecrafting" ? xpTables.runecrafting : skill === "social" ? xpTables.social : xpTables.skill;
    skills[skill] = levelFromXp(xp, costs, cap);
  }
  return skills;
}
