import assert from "node:assert/strict";
import test from "node:test";
import type { CandidateItem } from "../src/schemas/catalog";
import type { MarketQuote } from "../src/schemas/market";
import type { ProfileItem } from "../src/schemas/items";
import { buildWeaponLanes } from "../src/server/candidates/weapon";
import { orderDetailedCandidates, type TaggedCandidateLane } from "../src/server/advisor/context";
import { mergeCandidateEvidence } from "../src/server/advisor/relevance";
import { parseRequirementText } from "../src/server/reference/requirements";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

function currentWeapon(): ProfileItem {
  return { id: "CURRENT", uuid: null, name: "Current", count: 1, rarity: "rare", categories: ["weapon", "sword"],
    stats: { damage: 100, strength: 50 }, reforge: null, enchantments: {}, stars: null, recombobulated: false,
    lore: [], abilityText: [], setBonusText: [], source: "inventory" };
}

function candidate(id: string, stats: Record<string, number>, options: Partial<CandidateItem> = {}): CandidateItem {
  return { id, name: id, rarity: "epic", categories: ["weapon", "sword"], stats, lore: [], abilityText: [], setBonusText: [],
    requirements: [], unparsedRequirementText: [], wiki: null, marketKey: id, sources: { hypixel: true, neu: true }, ...options };
}

function quote(id: string, coins: number): MarketQuote {
  return { marketKey: id, coins, observedAt: "2026-09-23T00:00:00.000Z", basis: "LOWEST_BIN", confidence: "LOW" };
}

test("weapon lanes match weapon type and apply shared hard filters", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const catalog = [
    candidate("GOOD", { damage: 130, strength: 60 }),
    candidate("EXPENSIVE", { damage: 200 }),
    candidate("UNMET", { damage: 300 }, { requirements: [parseRequirementText("Requires Combat Skill 99")!] }),
    candidate("TEST_SWORD", { damage: 400 }),
    candidate("BOW", { damage: 500 }, { categories: ["weapon", "bow"] }),
  ];
  const quotes = new Map([quote("GOOD", 500), quote("EXPENSIVE", 2_000)].map(value => [value.marketKey, value]));
  const result = buildWeaponLanes({ current: currentWeapon(), catalog, profile, quotes, budgetCoins: 1_000 });
  assert.equal(result.weaponType, "sword");
  assert.deepEqual(result.lanes.damage.map(value => value.id), ["GOOD"]);
  assert.deepEqual(result.lanes.strength.map(value => value.id), ["GOOD"]);
});

test("ability lane retains raw text and does not require a known damage improvement", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const utility = candidate("UTILITY", { damage: 20, intelligence: 200 }, { abilityText: ["Ability: Travel RIGHT CLICK", "Teleport forward."] });
  const result = buildWeaponLanes({ current: currentWeapon(), catalog: [utility], profile });
  assert.equal(result.lanes.damage.length, 0);
  assert.equal(result.lanes.ability[0].id, "UTILITY");
  assert.deepEqual(result.lanes.ability[0].abilityText, utility.abilityText);
  assert.deepEqual(result.lanes.ability[0].knownChanges?.damage, { current: 100, candidate: 20 });
});

test("weapon lanes cap and deduplicate their candidate union", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const catalog = Array.from({ length: 30 }, (_, index) => candidate(`WEAPON_${index.toString().padStart(2, "0")}`, {
    damage: 101 + index, strength: 51 + index, critDamage: 1 + index, intelligence: 1 + index, attackSpeed: 1 + index,
  }, { abilityText: ["Ability: Fixture"] }));
  const result = buildWeaponLanes({ current: currentWeapon(), catalog, profile });
  for (const lane of Object.values(result.lanes)) assert.equal(lane.length, 6);
  assert.ok(result.candidates.length <= 20);
  assert.equal(new Set(result.candidates.map(value => value.id)).size, result.candidates.length);
  assert.ok(!result.lanes.damage.some(value => value.id === "WEAPON_00"));
  assert.ok(result.discovery.candidates.some(value => value.id === "WEAPON_00"));
});

test("weapon advisor discovery preserves filters, locked and over-budget candidates", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const locked = candidate("LOCKED", { damage: 200 }, { requirements: [parseRequirementText("Requires Combat Skill 99")!] });
  const overBudget = candidate("OVER_BUDGET", { damage: 180 });
  const catalog = [locked, overBudget, candidate("NO_FACTS", { damage: 100 }),
    candidate("WRONG_TYPE", { damage: 500 }, { categories: ["weapon", "bow"] }), candidate("TEST_SWORD", { damage: 500 })];
  const result = buildWeaponLanes({ current: currentWeapon(), catalog, profile,
    quotes: new Map([["OVER_BUDGET", quote("OVER_BUDGET", 2_000)]]), budgetCoins: 1_000, eligibilityMode: "ADVISOR_DISCOVERY" });
  assert.deepEqual(new Set(result.discovery.candidates.map(value => value.id)), new Set(["LOCKED", "OVER_BUDGET"]));
});

test("weapon discovery deduplicates and merges evidence from multiple baselines", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const target = candidate("TARGET", { damage: 130, strength: 60 });
  const first = buildWeaponLanes({ current: currentWeapon(), catalog: [target], profile, eligibilityMode: "ADVISOR_DISCOVERY" });
  const secondCurrent = { ...currentWeapon(), id: "CURRENT_TWO", stats: { damage: 120, strength: 20 } };
  const second = buildWeaponLanes({ current: secondCurrent, catalog: [target], profile, eligibilityMode: "ADVISOR_DISCOVERY" });
  const lanes: TaggedCandidateLane[] = [first, second].flatMap((result, index) => Object.entries(result.discovery.lanes)
    .map(([lane, candidates]) => ({ domain: "WEAPONS" as const, label: `weapon:CURRENT_${index}:${lane}`, candidates })));
  const ordered = orderDetailedCandidates(lanes);
  assert.equal(ordered.length, 1);
  const merged = mergeCandidateEvidence(ordered[0], lanes);
  assert.deepEqual(merged.knownChanges, {
    damage: { current: 120, candidate: 130 }, strength: { current: 50, candidate: 60 },
  });
  assert.deepEqual(lanes.filter(lane => lane.candidates.some(value => value.id === "TARGET")).map(lane => lane.label),
    ["weapon:CURRENT_0:damage", "weapon:CURRENT_0:strength", "weapon:CURRENT_1:damage", "weapon:CURRENT_1:strength"]);
});
