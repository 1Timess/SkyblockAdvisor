import assert from "node:assert/strict";
import test from "node:test";
import type { CandidateItem } from "../src/schemas/catalog";
import type { MarketQuote } from "../src/schemas/market";
import type { AccessoryReference } from "../src/schemas/normalized-profile";
import { buildAccessoryLanes } from "../src/server/candidates/accessory";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

function item(id: string, rarity: CandidateItem["rarity"]): CandidateItem {
  return { id, name: id, rarity, categories: ["accessory"], stats: {}, lore: [], abilityText: [], setBonusText: [], requirements: [],
    unparsedRequirementText: [], wiki: null, marketKey: id, sources: { hypixel: true, neu: true } };
}
function quote(id: string, coins: number): MarketQuote {
  return { marketKey: id, coins, observedAt: "2026-09-23T00:00:00.000Z", basis: "LOWEST_BIN", confidence: "LOW" };
}

test("accessory lanes use profile missing/upgrades and rank quoted coins per gained MP", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const missing: AccessoryReference[] = [
    { id: "CHEAP_COMMON", name: "Cheap", rarity: "common" },
    { id: "VALUABLE_RARE", name: "Valuable", rarity: "rare" },
  ];
  const upgrades: AccessoryReference[] = [{ id: "WOLF_RING", name: "Wolf Ring", rarity: "epic" }];
  profile.accessories.missing = missing; profile.accessories.upgrades = upgrades;
  const catalog = [item("CHEAP_COMMON", "common"), item("VALUABLE_RARE", "rare"), item("WOLF_RING", "epic")];
  const quoteValues = [quote("CHEAP_COMMON", 300), quote("VALUABLE_RARE", 400), quote("WOLF_RING", 700)];
  const result = buildAccessoryLanes({ profile, catalog, references: [...missing, ...upgrades], quotes: new Map(quoteValues.map(value => [value.marketKey, value])) });
  assert.deepEqual(result.lanes.missing.map(value => value.id), ["CHEAP_COMMON", "VALUABLE_RARE"]);
  assert.deepEqual(result.lanes.rarityUpgrade.map(value => value.id), ["WOLF_RING"]);
  assert.equal(result.lanes.rarityUpgrade[0].knownChanges?.magicalPower?.current, 8);
  assert.deepEqual(result.lanes.cheapestMp.map(value => value.id), ["VALUABLE_RARE", "CHEAP_COMMON", "WOLF_RING"]);
});

test("accessory lanes enforce hard budget and only emit explicit owned-item opportunities", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const missing = [{ id: "EXPENSIVE", name: "Expensive", rarity: "legendary" as const }];
  profile.accessories.missing = missing; profile.accessories.upgrades = [];
  const references: AccessoryReference[] = [
    ...missing,
    { id: "HEGEMONY_ARTIFACT", name: "Hegemony", rarity: "legendary", recombobulationAllowed: true, enrichmentAllowed: true },
    { id: "WOLF_RING", name: "Wolf Ring", rarity: "rare" },
  ];
  const catalog = [item("EXPENSIVE", "legendary"), item("HEGEMONY_ARTIFACT", "legendary"), item("WOLF_RING", "rare")];
  const expensive = quote("EXPENSIVE", 10_000);
  const result = buildAccessoryLanes({ profile, catalog, references, quotes: new Map([[expensive.marketKey, expensive]]), budgetCoins: 1_000 });
  assert.equal(result.lanes.missing.length, 0);
  assert.deepEqual(result.lanes.recombobulation.map(value => value.id), ["HEGEMONY_ARTIFACT"]);
  assert.deepEqual(result.lanes.enrichment.map(value => value.id), ["HEGEMONY_ARTIFACT"]);
  assert.ok(result.lanes.recombobulation[0].warnings.some(value => value.includes("recombobulation")));
});
