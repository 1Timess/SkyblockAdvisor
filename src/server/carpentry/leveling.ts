import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

export interface CarpentryLevelingMethod {
  id: string; name: string; inputName: string; inputMarketKey: string; inputCount: number; inputNpcSellValueEach: number;
  outputMarketKey: string; outputNpcSellValue: number; collectionPrefix: string; collectionTier: number;
  evidence: "VERIFIED_REFERENCE"; notes: string[];
}

export const carpentryLevelingMethods: readonly CarpentryLevelingMethod[] = [
  { id: "ENCHANTED_DIAMOND_BLOCK", name: "Enchanted Diamond Block", inputName: "Enchanted Diamond",
    inputMarketKey: "ENCHANTED_DIAMOND", inputCount: 160, inputNpcSellValueEach: 1280,
    outputMarketKey: "ENCHANTED_DIAMOND_BLOCK", outputNpcSellValue: 204800, collectionPrefix: "DIAMOND", collectionTier: 8,
    evidence: "VERIFIED_REFERENCE", notes: ["Common high-throughput Carpentry craft; output has a stable NPC recovery floor."] },
  { id: "ENCHANTED_SULPHUR_CUBE", name: "Enchanted Sulphur Cube", inputName: "Enchanted Sulphur",
    inputMarketKey: "ENCHANTED_SULPHUR", inputCount: 160, inputNpcSellValueEach: 1600,
    outputMarketKey: "ENCHANTED_SULPHUR_CUBE", outputNpcSellValue: 256000, collectionPrefix: "SULPHUR", collectionTier: 6,
    evidence: "VERIFIED_REFERENCE", notes: ["Economics can vary materially with Sulphur Bazaar liquidity; use live quotes rather than historical profit claims."] },
  { id: "ENCHANTED_COOKED_SALMON", name: "Enchanted Cooked Salmon", inputName: "Enchanted Raw Salmon",
    inputMarketKey: "ENCHANTED_RAW_SALMON", inputCount: 160, inputNpcSellValueEach: 1600,
    outputMarketKey: "ENCHANTED_COOKED_SALMON", outputNpcSellValue: 256000, collectionPrefix: "RAW_SALMON", collectionTier: 8,
    evidence: "VERIFIED_REFERENCE", notes: ["Output has a stable NPC recovery floor; compare that floor with live Bazaar recovery."] },
] as const;

export function collectionRequirementStatus(profile: NormalizedSkyBlockProfile, prefix: string, requiredTier: number) {
  const tiers = profile.unlockedCollectionTiers.filter(value => value.toUpperCase().startsWith(`${prefix}_`))
    .map(value => Number(value.slice(prefix.length + 1))).filter(Number.isFinite);
  if (!tiers.length) return "UNKNOWN" as const;
  return Math.max(...tiers) >= requiredTier ? "AVAILABLE" as const : "LOCKED" as const;
}
