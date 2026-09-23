import type { z } from "zod";
import type { slayerSchema } from "../../../schemas/progression";
import type { ProfileWarning } from "../../../schemas/items";
import type { RawMember } from "../../hypixel/types";

const shared = [10, 30, 250, 1500, 5000, 20000, 100000, 400000, 1000000];
export const slayerThresholds: Record<string, number[]> = {
  zombie: [5, 15, 200, 1000, 5000, 20000, 100000, 400000, 1000000],
  spider: [5, 25, 200, 1000, 5000, 20000, 100000, 400000, 1000000],
  wolf: shared, enderman: shared, blaze: shared, vampire: [20, 75, 240, 840, 2400],
};
export function slayerLevel(xp: number, thresholds: number[]) { return thresholds.filter(threshold => xp >= threshold).length; }

export function buildSlayers(member: RawMember, warnings: ProfileWarning[]) {
  const result: Record<string, z.infer<typeof slayerSchema>> = {};
  const bosses = member.slayer?.slayer_bosses;
  if (!bosses) warnings.push({ code: "PARTIAL_PROFILE", scope: "slayers", message: "Slayer data was not supplied." });
  for (const [id, boss] of Object.entries(bosses ?? {})) {
    const thresholds = slayerThresholds[id];
    if (!thresholds) { warnings.push({ code: "REFERENCE_DATA_MISSING", scope: "slayers", message: `No supplied leveling thresholds for ${id}.` }); continue; }
    const killsByTier: Record<string, number> = {};
    for (const [key, count] of Object.entries(boss)) {
      const match = key.match(/^boss_kills_tier_(\d)$/);
      if (match && count !== undefined) killsByTier[String(Number(match[1]) + 1)] = count;
    }
    const xp = boss.xp ?? 0;
    result[id] = { id, xp, level: slayerLevel(xp, thresholds), maxLevel: thresholds.length,
      killsByTier, totalKills: Object.values(killsByTier).reduce((a, b) => a + b, 0) };
  }
  return result;
}
