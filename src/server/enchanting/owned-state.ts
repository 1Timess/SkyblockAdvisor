import type { RawMember } from "../hypixel/types";
import { ownedEnchantingStateSchema, type OwnedEnchantingState } from "../../schemas/owned-enchanting";
import { enchantingLevelFromXp } from "../reference/enchanting-mechanics";

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function keys(value: unknown): string[] { return Object.keys(record(value) ?? {}).sort(); }

function nonnegative(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function count(value: unknown): number | null {
  const parsed = nonnegative(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function history(value: unknown) {
  const data = record(value) ?? {};
  const indexed = (prefix: string, integer: boolean): Record<string, number> => Object.fromEntries(
    Object.entries(data).filter(([key, raw]) => /^\d+$/.test(key.slice(prefix.length)) && key.startsWith(prefix)
      && (integer ? count(raw) : nonnegative(raw)) !== null)
      .map(([key, raw]) => [key.slice(prefix.length), raw as number])
  );
  return {
    attempts: indexed("attempts_", true), claims: indexed("claims_", true), bestScores: indexed("best_score_", false),
    bonusClicks: count(data.bonus_clicks), lastAttempt: nonnegative(data.last_attempt),
    lastClaimed: nonnegative(data.last_claimed), claimed: typeof data.claimed === "boolean" ? data.claimed : null,
  };
}

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
      chargeTrackTimestamp: nonnegative(data?.charge_track_timestamp),
      claimsResets: count(data?.claims_resets),
      claimsResetsTimestamp: nonnegative(data?.claims_resets_timestamp),
      serumsDrank: count(data?.serums_drank),
      claimedRetroactiveRng: typeof data?.claimed_retroactive_rng === "boolean" ? data.claimed_retroactive_rng : null,
      history: {
        chronomatron: history(data?.simon), ultrasequencer: history(data?.numbers), superpairs: history(data?.pairings),
      },
      attemptAvailability: "UNKNOWN",
    },
  });
}
