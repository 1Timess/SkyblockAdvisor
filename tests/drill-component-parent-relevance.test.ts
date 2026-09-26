import assert from "node:assert/strict";
import test from "node:test";
import { miningRelevantDrillParents } from "../src/server/candidates/drill-components";
import type { CandidateItem } from "../src/schemas/catalog";
import type { ProfileItem } from "../src/schemas/items";

function drill(uuid: string, stats: ProfileItem["stats"], engine: string | null): ProfileItem {
  return {
    id: "TEST_DRILL", uuid, name: uuid, count: 1, rarity: null, stars: 0, recombobulated: false, reforge: null,
    enchantments: {}, stats, categories: ["tool", "drill"], source: "inventory", slot: 0,
    drillComponents: { engine, fuelTank: null, upgradeModule: null, fuel: 0, source: "NBT" },
  };
}
function engine(id: string, speed: number, fortune: number): CandidateItem {
  return {
    id, name: id, rarity: null, categories: ["tool", "drill_component", "drill_engine"], stats: {}, lore: [],
    abilityText: [], setBonusText: [], requirements: [], unparsedRequirementText: [], wiki: null, marketKey: id,
    sources: { hypixel: true, neu: true },
    drillComponentMechanics: { slot: "ENGINE", miningSpeed: speed, miningFortune: fortune, fuelCapacity: null,
      pickaxeCooldownReductionPct: null, powderMultiplierPct: null, hotmPerkLevelBonus: null, fuelPreservationPct: null,
      fuelConsumptionMultiplier: null, conditional: false },
  };
}

test("filters an obsolete drill when another owned drill dominates after the same best engine", () => {
  const catalog = [engine("RUBY", 250, 30), engine("AMBER", 600, 100)];
  const obsolete = drill("obsolete", { miningSpeed: 900, miningFortune: 80 }, "RUBY");
  const relevant = drill("relevant", { miningSpeed: 1500, miningFortune: 180 }, "RUBY");
  assert.deepEqual([...miningRelevantDrillParents([obsolete, relevant], catalog)], ["relevant"]);
});

test("retains drill tradeoffs rather than collapsing distinct mining vectors", () => {
  const catalog = [engine("AMBER", 600, 100)];
  const speed = drill("speed", { miningSpeed: 1600, miningFortune: 100, pristine: 1 }, null);
  const pristine = drill("pristine", { miningSpeed: 900, miningFortune: 100, pristine: 2 }, null);
  assert.deepEqual(new Set(miningRelevantDrillParents([speed, pristine], catalog)), new Set(["speed", "pristine"]));
});
