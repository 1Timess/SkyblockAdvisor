import assert from "node:assert/strict";
import test from "node:test";
import { routeAdvisorQuestion } from "../src/server/advisor/routing";
import { buildProfileIntelligence } from "../src/server/advisor/profile-intelligence";
import type { NormalizedSkyBlockProfile } from "../src/schemas/normalized-profile";

test("routes explicit Foraging questions into the Foraging domain", () => {
  const route = routeAdvisorQuestion({ question: "What should I do next for HOTF and foraging?", profile: { progression: { dungeons: { selectedClass: null } } } as never });
  assert.equal(route.domain, "FORAGING");
  assert.equal(route.scope, "FORAGING");
  assert.equal(route.goal, "FORAGING");
  assert.deepEqual(route.activeDomains, ["FORAGING"]);
});

test("builds Foraging intelligence from observed normalized evidence", () => {
  const profile = {
    identity: { username: "Fixture", uuid: "a".repeat(32) },
    profile: { id: "profile", cuteName: "Cucumber", selected: true, gameMode: null, availableProfiles: [] },
    meta: { fetchedAt: "2026-09-30T00:00:00.000Z" },
    economy: { purse: null, bank: null, personalBank: null },
    progression: {
      skills: { foraging: { level: 45, maxLevel: 53, xp: 9373758 } },
      slayers: {}, dungeons: { catacombs: null, selectedClass: null, highestFloorNormal: null, highestFloorMaster: null },
      mining: {} as never, fishing: { itemsFished: {}, seaCreatureKills: null, trophyFish: {} }, enchanting: {} as never,
      foraging: { treeExperience: 165399.5, hotfLevel: 5, extraLevelCap: 3, activePreset: 1,
        presets: { foraging: { nodes: { sweep: { level: 1, value: 1, enabled: true, state: { level: 1, enabled: true } } } } },
        nodes: { sweep: { level: 1, value: 1, enabled: true, state: { level: 1, enabled: true } } },
        selectedAbility: "damage_boost", selectedAbilities: { foraging: "damage_boost" }, tokensSpentByPreset: { forest: 8 },
        sweepLevel: 1, foragingFortuneNodeLevel: null, core: {},
        whispers: { forest: { total: 2168038, spentByPreset: { "1": 2083226 } }, desert: { total: 1128314, spentByPreset: { "1": 138338 } } },
        treeGifts: { counts: { FIG: 41, MANGROVE: 29, HELIX: 2 }, milestoneTierClaimed: { FIG: 2, MANGROVE: 1 } }, hina: {}, starlyn: {} },
    },
    collections: { FIG_LOG: 77633, MANGROVE_LOG: 1252615, HELIX_LOG: 1045232 },
    attributes: { foragers_fortune: 32, mining_speed: 99 }, shards: { owned: null, fused: null, traps: null },
    inventoryItems: [], gear: { armor: { items: [], stats: {} }, equipment: { items: [], stats: {} }, weapons: [],
      loadouts: { names: {}, armor: { equippedSet: null, sets: {} }, equipment: { equippedSet: null, sets: {} } } },
    pets: { owned: [], activePet: null }, accessories: { magicalPower: { total: 0 }, selectedPower: null, highestMagicalPower: null,
      unlockedPowers: [], bagUpgradesPurchased: null, tuning: { highestUnlockedSlot: null, slots: {} }, owned: [], missing: [], upgrades: [] },
    craftedGenerators: [], unlockedCollectionTiers: [], playerStats: {} as never, bestiary: {} as never, otherProgression: {} as never, warnings: [],
  } as unknown as NormalizedSkyBlockProfile;
  const context = buildProfileIntelligence(profile).domains.FORAGING;
  assert.equal(context.domain, "FORAGING");
  if (context.domain !== "FORAGING") return;
  assert.equal(context.hotfLevel, 5);
  assert.equal(context.activePreset, 1);
  assert.equal(context.nodes.sweep.enabled, true);
  assert.deepEqual(context.treeGifts.counts, { FIG: 41, MANGROVE: 29, HELIX: 2 });
  assert.deepEqual(context.relevantAttributes, { foragers_fortune: 32 });
  assert.equal(context.gear.visible.length, 0);
  assert.ok(context.unavailableFacts.some(fact => fact.includes("Effective Sweep")));
});
