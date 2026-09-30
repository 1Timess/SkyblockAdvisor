import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { hotfCumulativeXp, torrhusRequiredHotfTier, treeGiftMilestones } from "./reference";

export type ForagingProgressionTarget =
  | { kind: "HOTF_TIER"; currentTier: number; targetTier: number; currentXp: number; requiredXp: number; xpRemaining: number }
  | { kind: "TORRHUS_ACCESS"; requiredHotfTier: number; currentHotfTier: number }
  | { kind: "TREE_GIFT_MILESTONE"; tree: string; currentGifts: number; targetGifts: number; giftsRemaining: number };

export function buildForagingProgressionFocus(profile: NormalizedSkyBlockProfile) {
  const state = profile.progression.foraging;
  const targets: ForagingProgressionTarget[] = [];
  if (state.hotfLevel !== null && state.treeExperience !== null && state.hotfLevel < hotfCumulativeXp.length) {
    const targetTier = state.hotfLevel + 1, requiredXp = hotfCumulativeXp[targetTier - 1];
    targets.push({ kind: "HOTF_TIER", currentTier: state.hotfLevel, targetTier, currentXp: state.treeExperience,
      requiredXp, xpRemaining: Math.max(0, requiredXp - state.treeExperience) });
  }
  if (state.hotfLevel !== null && state.hotfLevel < torrhusRequiredHotfTier)
    targets.push({ kind: "TORRHUS_ACCESS", requiredHotfTier: torrhusRequiredHotfTier, currentHotfTier: state.hotfLevel });

  for (const [tree, count] of Object.entries(state.treeGifts.counts)) {
    const next = treeGiftMilestones.find(threshold => threshold > count);
    if (next !== undefined) targets.push({ kind: "TREE_GIFT_MILESTONE", tree, currentGifts: count, targetGifts: next, giftsRemaining: next - count });
  }

  const collectionCapSources = (["FIG_LOG", "MANGROVE_LOG", "HELIX_LOG"] as const).map(collection => ({
    kind: "COLLECTION_CAP_SOURCE" as const, collection,
    status: "UNRESOLVED" as const,
  }));
  return { targets, collectionCapSources,
    note: "HOTF XP and Tree Gift gaps use observed profile values and verified thresholds. Collection counts alone do not prove tier-IX claim state, so individual collection cap sources remain unresolved. The aggregate reported extra level cap is preserved separately and is not attributed to a source." };
}
