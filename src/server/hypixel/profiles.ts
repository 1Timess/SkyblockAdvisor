import { AppError } from "../errors";
import type { RawProfile } from "./types";

export function selectProfile(profiles: RawProfile[], requested?: string): RawProfile {
  if (requested) {
    const explicit = profiles.find(p => p.profile_id === requested || p.cute_name.toLowerCase() === requested.toLowerCase());
    if (!explicit) throw new AppError("PROFILE_NOT_FOUND", "The requested SkyBlock profile was not found.", 404);
    return explicit;
  }
  const profile = profiles.find(p => p.selected) ?? profiles[0];
  if (!profile) throw new AppError("NO_PROFILES", "This player has no available SkyBlock profiles.", 404);
  return profile;
}

export function summarizeProfile(p: RawProfile) {
  return { id: p.profile_id, cuteName: p.cute_name, selected: p.selected ?? false, gameMode: p.game_mode ?? null };
}
