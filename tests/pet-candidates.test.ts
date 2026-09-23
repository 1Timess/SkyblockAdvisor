import assert from "node:assert/strict";
import test from "node:test";
import type { NeuItem } from "../src/schemas/neu";
import type { MarketQuote } from "../src/schemas/market";
import { buildPetLanes } from "../src/server/candidates/pet";
import { InMemoryNeuRepository } from "../src/server/reference/neu/repository";
import { buildPetCandidateCatalog } from "../src/server/reference/pet-catalog";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

const metadata = { provider: "neu" as const, repository: "fixture", branch: "main", etag: null, downloadedAt: "2026-01-01T00:00:00.000Z", itemCount: 4 };
function neuPet(type: string, tier: number, rarity: string): NeuItem {
  return { internalname: `${type};${tier}`, displayname: `§7[Lvl {LVL}] ${type}`, lore: ["§8Combat Pet", "", "§6Fixture Ability", "§7Does something useful.", "", `§${tier}§l${rarity}`] };
}
function quote(key: string, coins: number): MarketQuote {
  return { marketKey: key, coins, observedAt: "2026-09-23T00:00:00.000Z", basis: "LOWEST_BIN", confidence: "LOW" };
}

test("NEU pet variants become candidate items with pet market keys and raw ability text", () => {
  const repository = new InMemoryNeuRepository([neuPet("SHEEP", 3, "EPIC"), { internalname: "NOT_A_PET;3", displayname: "Other", lore: ["EPIC SWORD"] }], metadata);
  const catalog = buildPetCandidateCatalog(repository);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].marketKey, "PET:SHEEP:EPIC");
  assert.equal(catalog[0].sources.hypixel, false);
  assert.deepEqual(catalog[0].abilityText, ["Fixture Ability", "Does something useful."]);
});

test("pet lanes include owned leveling, next rarity, and caller-supplied role targets", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const repository = new InMemoryNeuRepository([
    neuPet("SHEEP", 3, "EPIC"), neuPet("SHEEP", 4, "LEGENDARY"), neuPet("TIGER", 2, "RARE"), neuPet("TIGER", 3, "EPIC"),
  ], metadata);
  const catalog = buildPetCandidateCatalog(repository);
  profile.pets.owned = [{ uuid: null, type: "SHEEP", name: "Sheep", rarity: "epic", effectiveRarity: "epic", level: 50, maxLevel: 100,
    xp: 0, xpCurrent: 0, xpForNext: 1, progress: 0, active: true, heldItem: null, candyUsed: 0, skin: null, stats: {}, abilityLore: [] }];
  const prices = [quote("PET:SHEEP:LEGENDARY", 2_000), quote("PET:TIGER:RARE", 500)];
  const result = buildPetLanes({ profile, catalog, quotes: new Map(prices.map(value => [value.marketKey, value])), rolePetTypes: ["TIGER"] });
  assert.deepEqual(result.lanes.owned.map(value => value.id), ["SHEEP;3"]);
  assert.deepEqual(result.lanes.levelTarget[0].knownChanges?.level, { current: 50, candidate: 100 });
  assert.deepEqual(result.lanes.rarityUpgrade.map(value => value.id), ["SHEEP;4"]);
  assert.deepEqual(result.lanes.roleProgression.map(value => value.id), ["TIGER;2"]);
});

test("pet rarity and role candidates honor a hard budget when prices are known", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.pets.owned = [{ uuid: null, type: "SHEEP", name: "Sheep", rarity: "epic", effectiveRarity: "epic", level: 100, maxLevel: 100,
    xp: 0, xpCurrent: 0, xpForNext: 0, progress: 0, active: true, heldItem: null, candyUsed: 0, skin: null, stats: {}, abilityLore: [] }];
  const catalog = buildPetCandidateCatalog(new InMemoryNeuRepository([neuPet("SHEEP", 3, "EPIC"), neuPet("SHEEP", 4, "LEGENDARY"), neuPet("TIGER", 2, "RARE")], metadata));
  const values = [quote("PET:SHEEP:LEGENDARY", 2_000), quote("PET:TIGER:RARE", 500)];
  const result = buildPetLanes({ profile, catalog, quotes: new Map(values.map(value => [value.marketKey, value])), budgetCoins: 1_000, rolePetTypes: ["TIGER"] });
  assert.equal(result.lanes.rarityUpgrade.length, 0);
  assert.deepEqual(result.lanes.roleProgression.map(value => value.id), ["TIGER;2"]);
});

function ownedRabbit(rarity: string, level: number) {
  return { uuid: null, type: "RABBIT", name: "Rabbit", rarity, effectiveRarity: rarity, level, maxLevel: 100,
    xp: 0, xpCurrent: 0, xpForNext: level < 100 ? 1 : 0, progress: 0, active: false, heldItem: null,
    candyUsed: 0, skin: null, stats: {}, abilityLore: [] };
}

test("lower-level duplicate pets do not create account progression targets", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.pets.owned = [ownedRabbit("legendary", 1), ownedRabbit("legendary", 100)];
  const catalog = buildPetCandidateCatalog(new InMemoryNeuRepository([neuPet("RABBIT", 4, "LEGENDARY")], metadata));
  const result = buildPetLanes({ profile, catalog });
  assert.equal(result.lanes.owned.length, 2);
  assert.equal(result.lanes.levelTarget.length, 0);
});

test("higher rarity is the best pet representative before level", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.pets.owned = [ownedRabbit("epic", 100), ownedRabbit("legendary", 70)];
  const catalog = buildPetCandidateCatalog(new InMemoryNeuRepository([
    neuPet("RABBIT", 3, "EPIC"), neuPet("RABBIT", 4, "LEGENDARY"), neuPet("RABBIT", 5, "MYTHIC"),
  ], metadata));
  const result = buildPetLanes({ profile, catalog });
  assert.deepEqual(result.lanes.levelTarget.map(value => value.id), ["RABBIT;4"]);
  assert.deepEqual(result.lanes.levelTarget[0].knownChanges?.level, { current: 70, candidate: 100 });
  assert.deepEqual(result.lanes.rarityUpgrade.map(value => value.id), ["RABBIT;5"]);
});
