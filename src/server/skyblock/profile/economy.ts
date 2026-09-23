import type { RawMember, RawProfile } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";

export function buildEconomy(member: RawMember, profile: RawProfile, warnings: ProfileWarning[]) {
  if (member.currencies?.coin_purse === undefined) warnings.push({ code: "PARTIAL_PROFILE", scope: "economy", message: "Purse balance was not supplied." });
  return { purse: member.currencies?.coin_purse ?? null, bank: profile.banking?.balance ?? null, personalBank: member.profile?.bank_account ?? null };
}
