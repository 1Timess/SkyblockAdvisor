import type { RawMember } from "../hypixel/types";
import { ownedEnchantingStateSchema, type OwnedEnchantingState } from "../../schemas/owned-enchanting";
import { enchantingLevelFromXp } from "../reference/enchanting-mechanics";

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function keys(value: unknown): string[] { return Object.keys(record(value) ?? {}).sort(); }

export function buildOwnedEnchantingState(member: RawMember): OwnedEnchantingState {
  const xp = member.player_data?.experience?.SKILL_ENCHANTING;
  const skill = typeof xp === "number" && Number.isFinite(xp) && xp >= 0
    ? { xp, level: enchantingLevelFromXp(xp).level } : null;
  const raw = member.experimentation;
  const data = record(raw);
  return ownedEnchantingStateSchema.parse({
    skill,
    experimentation: {
      status: raw === undefined || raw === null ? "ABSENT" : data ? "PRESENT" : "MALFORMED",
      keys: keys(raw),
      sections: {
        chronomatron: keys(data?.simon),
        ultrasequencer: keys(data?.numbers),
        superpairs: keys(data?.pairings),
      },
      attemptAvailability: "UNKNOWN",
    },
  });
}
