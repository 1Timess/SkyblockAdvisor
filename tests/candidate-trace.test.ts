import assert from "node:assert/strict";
import test from "node:test";
import type { CandidateItem } from "../src/schemas/catalog";
import type { ProfileItem } from "../src/schemas/items";
import { catalogCoverageSummary, traceCandidateCoverage } from "../src/server/candidates/trace";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

function current(): ProfileItem {
  return { id: "CURRENT", uuid: null, name: "Current", count: 1, rarity: "rare", categories: ["armor", "chestplate"], stats: { defense: 100 },
    reforge: null, enchantments: {}, stars: null, recombobulated: false, lore: [], abilityText: [], setBonusText: [], source: "armor" };
}

function item(id: string, defense: number, setBonusText: string[] = []): CandidateItem {
  return { id, name: id, rarity: "epic", categories: ["armor", "chestplate"], stats: defense ? { defense } : {}, lore: [], abilityText: [], setBonusText,
    requirements: [], unparsedRequirementText: [], wiki: null, marketKey: id, sources: { hypixel: true, neu: true } };
}

test("coverage trace distinguishes pre-cap qualification from raw lane inclusion", async () => {
  const base = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const profile = { ...base, gear: { ...base.gear, armor: { ...base.gear.armor, items: [current()] }, weapons: [] } };
  const target = item("TARGET", 110), catalog = [target, ...Array.from({ length: 6 }, (_, index) => item(`HIGH_${index}`, 200 + index))];
  const trace = traceCandidateCoverage({ item: target, profile, catalog, quotes: new Map() });
  assert.equal(trace.prepareCandidateSucceeded, true);
  assert.deepEqual(trace.pairedCurrentItems[0].qualifyingLanesBeforeCap, ["defense"]);
  assert.equal(trace.rawAdvisorPresence, false);
  assert.equal(trace.firstExclusionStage, "LANE_CAP");
  assert.equal(trace.rootCauseClassification, "I");
});

test("coverage trace reports lane nomination limits and category coverage", async () => {
  const base = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const profile = { ...base, gear: { ...base.gear, armor: { ...base.gear.armor, items: [current()] }, weapons: [] } };
  const onlySetBonus = item("SET_ONLY", 0, ["A meaningful but uninterpreted set bonus"]);
  const trace = traceCandidateCoverage({ item: onlySetBonus, profile, catalog: [onlySetBonus], quotes: new Map() });
  assert.equal(trace.firstExclusionStage, "LANE_NOMINATION");
  assert.equal(trace.rootCauseClassification, "E");
  assert.deepEqual(catalogCoverageSummary([onlySetBonus]).armor, { total: 1, missingRecognizedSlot: 0,
    bySlot: { helmet: 0, chestplate: 1, leggings: 0, boots: 0 } });
});
