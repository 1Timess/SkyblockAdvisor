import assert from "node:assert/strict";
import test from "node:test";
import { buildExtendedPlayerState } from "../src/server/skyblock/domains/player-state";
import type { RawMember } from "../src/server/hypixel/types";
import { centerOfForestVerifiedEffects, currentFlatSweepChanges, currentGalateaNpcLogPrices, currentTreeGiftMilestoneSweepPerTier, currentTreeGiftXp, foragingLevelCapSources, foragingTreeMechanics, halfFullEmptyScope, hotfCumulativeXp, hotfLevelFromXp, hotfTierNodes, hotfWhisperCurrencyByTier, starlynContestPointBonuses, throwingAxeMechanics, torrhusRequiredHotfTier, treeGiftHotfXp, treeGiftMilestones, treeToughness, verifiedForagingGearSweep } from "../src/server/foraging/reference";

test("normalizes Foraging presets without mixing inactive HOTF state", () => {
  const member = {
    player_data: { experience: { SKILL_FORAGING: 9_373_758.94219984, SKILL_FORAGING_extra_level_cap: 3 } },
    skill_tree: {
      experience: { foraging: 165399.5 },
      nodes: {
        foraging: { sweep: 1, deep_waters: 50, toggle_sweep: true },
        foraging_2: { sweep: 41, foraging_fortune: 31, daily_wishes: 100, toggle_sweep: true },
        foraging_3: { center_of_the_forest: 1 },
        foraging_4: { center_of_the_forest: 1 },
        foraging_5: { center_of_the_forest: 1 },
      },
      tokens_spent: { forest: 8, forest_2: 10, forest_3: 0, mountain: 25 },
      selected_ability: { foraging: "damage_boost", foraging_2: "damage_boost", mining: "pickobulus" },
      selected_skill_tree_slot: { foraging: 1, mining: 1 },
    },
    foraging_core: { whispers: {
      forest: { "1": { spent: 2083226 }, "2": { spent: 1538531 }, total: 2168038 },
      desert: { "1": { spent: 138338 }, "2": { spent: 1056303 }, total: 1128314 },
    } },
    foraging: {
      tree_gifts: { FIG: 41, HELIX: 2, MANGROVE: 29, milestone_tier_claimed: { FIG: 2, MANGROVE: 1 } },
      hina: { tasks: { tier_claimed: 2 } },
      starlyn: { personal_bests: { agatha: 12880, miria: 11160 } },
    },
  } satisfies RawMember;

  const state = buildExtendedPlayerState(member).foraging;
  assert.equal(state.treeExperience, 165399.5);
  assert.equal(state.hotfLevel, 5);
  assert.equal(state.extraLevelCap, 3);
  assert.equal(state.activePreset, 1);
  assert.equal(state.sweepLevel, 1);
  assert.equal(state.foragingFortuneNodeLevel, null);
  assert.equal(state.presets.foraging_2.nodes.sweep.level, 41);
  assert.equal(state.presets.foraging_2.nodes.foraging_fortune.level, 31);
  assert.equal(state.selectedAbility, "damage_boost");
  assert.deepEqual(state.tokensSpentByPreset, { forest: 8, forest_2: 10, forest_3: 0 });
  assert.deepEqual(state.whispers.forest, { total: 2168038, spentByPreset: { "1": 2083226, "2": 1538531 } });
  assert.deepEqual(state.whispers.desert, { total: 1128314, spentByPreset: { "1": 138338, "2": 1056303 } });
  assert.deepEqual(state.treeGifts.counts, { FIG: 41, HELIX: 2, MANGROVE: 29 });
  assert.deepEqual(state.treeGifts.milestoneTierClaimed, { FIG: 2, MANGROVE: 1 });
  assert.deepEqual(state.hina, { tasks: { tier_claimed: 2 } });
  assert.deepEqual(state.starlyn, { personal_bests: { agatha: 12880, miria: 11160 } });
});

test("active Foraging convenience fields follow the selected preset", () => {
  const member = {
    skill_tree: {
      nodes: { foraging: { sweep: 1 }, foraging_2: { sweep: 41, foraging_fortune: 31 } },
      selected_skill_tree_slot: { foraging: 2 },
      selected_ability: { foraging: "damage_boost", foraging_2: "tree_whisperer" },
    },
  } satisfies RawMember;
  const state = buildExtendedPlayerState(member).foraging;
  assert.equal(state.activePreset, 2);
  assert.equal(state.sweepLevel, 41);
  assert.equal(state.foragingFortuneNodeLevel, 31);
  assert.equal(state.selectedAbility, "tree_whisperer");
});


test("verified HOTF reference mechanics remain distinct from HOTM", () => {
  assert.deepEqual(hotfCumulativeXp, [0, 3000, 12000, 37000, 97000, 197000, 347000, 547000]);
  assert.equal(hotfLevelFromXp(165399.5), 5);
  assert.equal(hotfLevelFromXp(547000), 8);
  assert.equal(Object.values(hotfTierNodes).flat().length, 36);
  assert.equal(hotfWhisperCurrencyByTier[3], "forest");
  assert.equal(hotfWhisperCurrencyByTier[4], "desert");
  assert.equal(torrhusRequiredHotfTier, 4);
  assert.deepEqual(treeGiftMilestones, [10, 25, 100, 250, 500, 1000, 2500]);
  assert.deepEqual(treeGiftHotfXp, { FIG: 10, MANGROVE: 20, HELIX: 30 });
  assert.deepEqual(treeToughness, { FIG: 10, MANGROVE: 50, HELIX: 150 });
});


test("deeper Foraging reference reflects current post-Torrhus mechanics", () => {
  assert.deepEqual(foragingTreeMechanics.FIG.style, ["trunk", "branches"]);
  assert.deepEqual(foragingTreeMechanics.MANGROVE.style, ["branches", "trunk", "roots"]);
  assert.deepEqual(foragingTreeMechanics.HELIX.style, ["light_logs", "red_logs"]);
  assert.equal(throwingAxeMechanics.normalLogBreakFraction, 0.5);
  assert.equal(currentFlatSweepChanges.lottery, 10);
  assert.equal(currentFlatSweepChanges.agathaPowerMaxSweep, 25);
  assert.equal(currentFlatSweepChanges.miriaPowerMaxSweep, 25);
  assert.deepEqual(centerOfForestVerifiedEffects, { 2: { axeAbilityLevels: 1 }, 4: { treeGiftTracking: 5 } });
  assert.equal(currentTreeGiftMilestoneSweepPerTier, 3);
  assert.equal(halfFullEmptyScope, "island_wide");
  assert.deepEqual(currentTreeGiftXp, {
    FIG: { foragingXp: 100, hotfXp: 10 },
    MANGROVE: { foragingXp: 500, hotfXp: 20 },
    HELIX: { foragingXp: 1500, hotfXp: 30 },
  });
  assert.deepEqual(currentGalateaNpcLogPrices, { FIG: 8, MANGROVE: 14, HELIX: 20 });
  assert.equal(verifiedForagingGearSweep.HELIX_CHOPPER, 50);
  assert.equal(verifiedForagingGearSweep.SLOTH_PET_BASE, 25);
  assert.deepEqual(starlynContestPointBonuses, { MOONGLADE_BELT_PERCENT: 5, TORRHUS_BELT_PERCENT: 10 });
  assert.deepEqual(foragingLevelCapSources, {
    collectionTierNine: { FIG_LOG: 1, MANGROVE_LOG: 1, HELIX_LOG: 1 },
    agathaPrizeShop: 2,
    miriaPrizeShop: 2,
  });
});
