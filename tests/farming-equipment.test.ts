import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";
import { candidateItemSchema } from "../src/schemas/catalog";
import { buildFarmingEquipmentComparisons, recipeConsumes } from "../src/server/farming/equipment-comparisons";
import { InMemoryNeuRepository } from "../src/server/reference/neu/repository";

const item = (id: string, fortune: number) => candidateItemSchema.parse({ id, name: id, rarity: "rare", categories: ["armor"],
  stats: { farmingFortune: fortune }, lore: [], abilityText: ["Conditional ability"], setBonusText: ["Set bonus"], requirements: [],
  unparsedRequirementText: [], wiki: null, marketKey: id, sources: { hypixel: true, neu: true } });
const neu = new InMemoryNeuRepository([
  { internalname: "CROPIE_HELMET", recipe: { A1: "MELON_HELMET:1" } },
  { internalname: "CROPIE_BOOTS", recipe: { A1: "MELON_HELMET:1" } },
  { internalname: "SQUASH_HELMET", recipe: { A1: "CROPIE_HELMET:1" } },
], { provider: "neu", repository: "fixture", branch: "main", etag: null, downloadedAt: "2026-09-29T00:00:00Z", itemCount: 3 });

test("equipment comparisons use direct same-slot recipes and template deltas, not modified observed stats", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const observed = { ...profile.inventoryItems[0], id: "MELON_HELMET", name: "Bustling Tater Helmet", stats: { farmingFortune: 120 } };
  profile.inventoryItems = [observed];
  const target = item("CROPIE_HELMET", 25);
  target.requirements = [{ kind: "SKILL_LEVEL", skill: "farming", level: 60, sourceText: "Requires Farming Skill 60" }];
  const result = buildFarmingEquipmentComparisons(profile, [item("MELON_HELMET", 15), target, item("CROPIE_BOOTS", 25), item("SQUASH_HELMET", 30)], neu);
  assert.equal(result.mechanics[0].observedFortune, 120);
  assert.equal(result.comparisons.length, 1);
  assert.equal(result.comparisons[0].catalogFortuneDifference, 10);
  assert.equal(result.comparisons[0].requirements[0].status, "NOT_MET");
  assert.equal(result.comparisons[0].purchasePrice, null);
  profile.inventoryItems.push({ ...observed, id: "SQUASH_HELMET" });
  assert.equal(buildFarmingEquipmentComparisons(profile, [target, item("SQUASH_HELMET", 30)], neu).comparisons.length, 0);
  profile.inventoryItems.pop();
  profile.inventoryItems.push({ ...observed, id: "CROPIE_HELMET" });
  assert.equal(buildFarmingEquipmentComparisons(profile, [target], neu).comparisons.length, 0);
});

test("missing catalog baseline stays unknown and Rancher boots retain utility without replacement", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.inventoryItems = [{ ...profile.inventoryItems[0], id: "MELON_HELMET" }, { ...profile.inventoryItems[0], id: "RANCHERS_BOOTS" }];
  const result = buildFarmingEquipmentComparisons(profile, [item("CROPIE_HELMET", 25)], neu);
  assert.equal(result.comparisons[0].catalogFortuneDifference, null);
  assert.ok(result.mechanics.find(value => value.itemId === "RANCHERS_BOOTS")?.utilityWarning);
  assert.equal(buildFarmingEquipmentComparisons(profile, [], null).coverage, "UNREPORTED");
  assert.equal(recipeConsumes({ output: "MELON_HELMET:1" }, "MELON_HELMET"), false);
  assert.equal(recipeConsumes({ A1: "MELON_HELMET_EXTRA:1" }, "MELON_HELMET"), false);
});

test("unrelated catalog items never enter farming recipe traversal", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.inventoryItems = [{ ...profile.inventoryItems[0], id: "MELON_HELMET" }];
  let reads = 0;
  const counted = { getById: (id: string) => { reads++; return neu.getById(id); },
    getAll: () => neu.getAll(), getMetadata: () => neu.getMetadata(), getFailures: () => neu.getFailures() };
  const unrelated = Array.from({ length: 6000 }, (_, index) => item(`UNRELATED_${index}`, 0));
  const result = buildFarmingEquipmentComparisons(profile, [...unrelated, item("MELON_HELMET", 15), item("CROPIE_HELMET", 25)], counted);
  assert.equal(result.comparisons.length, 1);
  assert.ok(reads <= 3, `Expected bounded relevant recipe reads, got ${reads}`);
});

test("Garden gates and historical prices are explicit on non-recipe alternatives", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.inventoryItems = [{ ...profile.inventoryItems[0], id: "FARM_SUIT_HELMET" }];
  const current = item("FARM_SUIT_HELMET", 5), target = item("FARM_ARMOR_HELMET", 10);
  target.requirements = [{ kind: "GARDEN_LEVEL", level: 5, sourceText: "Requires Garden Level 5" }];
  const quotes = new Map([[target.id, { marketKey: target.id, coins: 100, observedAt: "2026-09-25T00:00:00Z", confidence: "HIGH" as const, basis: "LOWEST_BIN" as const }]]);
  const run = (garden: number | null) => buildFarmingEquipmentComparisons(profile, [current, target], neu, quotes, garden, Date.parse("2026-09-30T00:00:00Z"));
  const comparison = run(10).comparisons[0];
  assert.equal(comparison.basis, "SAME_SLOT_CATALOG_ALTERNATIVE");
  assert.equal(comparison.requirements[0].status, "MET");
  assert.equal(run(3).comparisons[0].requirements[0].status, "NOT_MET");
  assert.equal(run(null).comparisons[0].requirements[0].status, "UNKNOWN");
  assert.equal(comparison.purchasePrice?.freshness, "STALE");
  assert.equal(comparison.purchasePrice?.ageHours, 120);
  profile.inventoryItems.push({ ...profile.inventoryItems[0], id: target.id });
  assert.equal(run(10).comparisons.length, 0);
});

test("equipment alternatives stay in-slot and leveled tools do not use Fortune-only fallback", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const observed = profile.inventoryItems[0];
  profile.inventoryItems = [{ ...observed, id: "LOTUS_CLOAK" }, { ...observed, id: "MELON_DICER_1" }];
  const catalog = [item("LOTUS_CLOAK", 5), item("BLOSSOM_CLOAK", 10), item("BLOSSOM_BELT", 20),
    item("MELON_DICER_1", 5), item("MELON_DICER_2", 10)];
  const result = buildFarmingEquipmentComparisons(profile, catalog, neu);
  assert.deepEqual(result.comparisons.map(value => value.targetItemId), ["BLOSSOM_CLOAK"]);
  profile.inventoryItems.push({ ...observed, id: "BLOSSOM_CLOAK" });
  assert.equal(buildFarmingEquipmentComparisons(profile, [...catalog, item("PEONY_CLOAK", 15)], neu).comparisons.length, 1);
  assert.equal(buildFarmingEquipmentComparisons(profile, [...catalog, item("PEONY_CLOAK", 15)], neu).comparisons[0].currentItemId, "BLOSSOM_CLOAK");
});
