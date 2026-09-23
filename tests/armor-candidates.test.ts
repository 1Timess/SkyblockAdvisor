import assert from "node:assert/strict";
import test from "node:test";
import type { CandidateItem } from "../src/schemas/catalog";
import type { MarketQuote } from "../src/schemas/market";
import type { ProfileItem } from "../src/schemas/items";
import { buildArmorLanes } from "../src/server/candidates/armor";
import { parseRequirementText } from "../src/server/reference/requirements";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

function currentArmor(): ProfileItem {
  return { id: "CURRENT", uuid: null, name: "Current", count: 1, rarity: "rare", categories: ["armor", "chestplate"],
    stats: { defense: 100, health: 100 }, reforge: null, enchantments: {}, stars: null, recombobulated: false,
    lore: [], abilityText: [], setBonusText: [], source: "armor" };
}

function candidate(id: string, stats: Record<string, number>, options: Partial<CandidateItem> = {}): CandidateItem {
  return { id, name: id, rarity: "epic", categories: ["armor", "chestplate"], stats, lore: [], abilityText: [], setBonusText: [],
    requirements: [], unparsedRequirementText: [], wiki: null, marketKey: id, sources: { hypixel: true, neu: true }, ...options };
}

function quote(id: string, coins: number): MarketQuote {
  return { marketKey: id, coins, observedAt: "2026-09-23T00:00:00.000Z", basis: "LOWEST_BIN", confidence: "LOW" };
}

test("armor lanes enforce slot, known requirement, ownership, budget, and known-stat filters", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const unmet = parseRequirementText("Requires Combat Skill 99")!;
  const catalog = [
    candidate("GOOD", { defense: 130, health: 105 }),
    candidate("TOO_EXPENSIVE", { defense: 200 }),
    candidate("UNMET", { defense: 300 }, { requirements: [unmet] }),
    candidate("NO_IMPROVEMENT", { defense: 100 }),
    candidate("WRONG_SLOT", { defense: 500 }, { categories: ["armor", "helmet"] }),
    candidate("TEST_SWORD", { defense: 500 }),
  ];
  const quotes = new Map([quote("GOOD", 500), quote("TOO_EXPENSIVE", 2_000)].map(value => [value.marketKey, value]));
  const result = buildArmorLanes({ current: currentArmor(), catalog, profile, quotes, budgetCoins: 1_000 });
  assert.deepEqual(result.lanes.defense.map(value => value.id), ["GOOD"]);
  assert.deepEqual(result.lanes.health.map(value => value.id), ["GOOD"]);
  assert.deepEqual(result.candidates.map(value => value.id), ["GOOD"]);
  assert.deepEqual(result.lanes.defense[0].knownChanges, { defense: { current: 100, candidate: 130 } });
});

test("armor lanes retain unknown requirements and unknown prices with warnings", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const hotm = parseRequirementText("Requires Heart of the Mountain Tier 5")!;
  const item = candidate("UNKNOWN_FACTS", { defense: 120 }, { requirements: [hotm], unparsedRequirementText: ["Requires Mysterious Access"] });
  const result = buildArmorLanes({ current: currentArmor(), catalog: [item], profile, budgetCoins: 1_000 });
  assert.equal(result.lanes.defense.length, 1);
  assert.equal(result.lanes.defense[0].warnings.length, 3);
  assert.deepEqual(result.lanes.defense[0].requirements, [hotm.sourceText, "Requires Mysterious Access"]);
});

test("armor lanes cap each stat at six and deduplicate the union at twenty", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const catalog = Array.from({ length: 30 }, (_, index) => candidate(`ITEM_${index.toString().padStart(2, "0")}`, {
    defense: 101 + index, health: 101 + index, strength: 1 + index, critDamage: 1 + index,
    intelligence: 1 + index, speed: 1 + index,
  }));
  const result = buildArmorLanes({ current: currentArmor(), catalog, profile });
  for (const lane of Object.values(result.lanes)) assert.equal(lane.length, 6);
  assert.ok(result.candidates.length <= 20);
  assert.equal(new Set(result.candidates.map(value => value.id)).size, result.candidates.length);
});
