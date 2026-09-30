import assert from "node:assert/strict";
import test from "node:test";
import { buildForagingProgressionFocus } from "../src/server/foraging/progression-focus";
import type { NormalizedSkyBlockProfile } from "../src/schemas/normalized-profile";

function profile(hotfLevel: number | null, treeExperience: number | null, gifts: Record<string, number>, extraLevelCap: number | null) {
  return { progression: { foraging: { hotfLevel, treeExperience, extraLevelCap, treeGifts: { counts: gifts } } } } as unknown as NormalizedSkyBlockProfile;
}

test("builds exact next HOTF and Tree Gift gaps from verified thresholds", () => {
  const focus = buildForagingProgressionFocus(profile(5, 165399.5, { FIG: 41, MANGROVE: 29, HELIX: 2 }, 3));
  assert.deepEqual(focus.targets, [
    { kind: "HOTF_TIER", currentTier: 5, targetTier: 6, currentXp: 165399.5, requiredXp: 197000, xpRemaining: 31600.5 },
    { kind: "TREE_GIFT_MILESTONE", tree: "FIG", currentGifts: 41, targetGifts: 100, giftsRemaining: 59 },
    { kind: "TREE_GIFT_MILESTONE", tree: "MANGROVE", currentGifts: 29, targetGifts: 100, giftsRemaining: 71 },
    { kind: "TREE_GIFT_MILESTONE", tree: "HELIX", currentGifts: 2, targetGifts: 10, giftsRemaining: 8 },
  ]);
  assert.ok(focus.collectionCapSources.every(source => source.status === "UNRESOLVED"));
});

test("surfaces Torrhus access only before HOTF 4", () => {
  const focus = buildForagingProgressionFocus(profile(3, 12000, { FIG: 10 }, null));
  assert.ok(focus.targets.some(target => target.kind === "TORRHUS_ACCESS" && target.requiredHotfTier === 4));
  assert.ok(buildForagingProgressionFocus(profile(4, 37000, {}, null)).targets.every(target => target.kind !== "TORRHUS_ACCESS"));
});

test("does not invent progression gaps when HOTF or gift evidence is absent or complete", () => {
  const focus = buildForagingProgressionFocus(profile(null, null, { FIG: 2500 }, null));
  assert.deepEqual(focus.targets, []);
  assert.ok(focus.collectionCapSources.every(source => source.status === "UNRESOLVED"));
});
