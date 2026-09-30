import assert from "node:assert/strict";
import test from "node:test";
import { buildExtendedPlayerState } from "../src/server/skyblock/domains/player-state";
import type { RawMember } from "../src/server/hypixel/types";

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
