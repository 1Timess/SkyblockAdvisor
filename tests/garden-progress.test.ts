import assert from "node:assert/strict";
import test from "node:test";
import { buildGardenProgress } from "../src/server/farming/garden-progress";
import { HypixelClient } from "../src/server/hypixel/client";
import { TtlCache } from "../src/server/cache/ttl-cache";

test("Garden XP and visitor thresholds use sourced cumulative totals", () => {
  const early = buildGardenProgress({ garden_experience: 12181, commission_data: { total_completed: 40, unique_npcs_served: 30 },
    resources_collected: { WHEAT: 154455 }, active_commissions: {} });
  assert.equal(early.gardenLevel, 10);
  assert.deepEqual(early.nextGardenLevel, { level: 11, xpRequired: 20120, xpRemaining: 7939 });
  assert.deepEqual(early.nextOffersMilestone, { tier: 6, threshold: 50, remaining: 10 });
  assert.deepEqual(early.nextUniqueVisitorsMilestone, { tier: 6, threshold: 40, remaining: 10 });
  const late = buildGardenProgress({ garden_experience: 9330, commission_data: { total_completed: 98, unique_npcs_served: 46 },
    active_commissions: { tia: { status: "NOT_STARTED", requirement: [{ item: "ENCHANTED_CACTUS", amount: 1 }] } } });
  assert.equal(late.gardenLevel, 9);
  assert.deepEqual(late.nextGardenLevel, { level: 10, xpRequired: 10120, xpRemaining: 790 });
  assert.deepEqual(late.nextOffersMilestone, { tier: 8, threshold: 100, remaining: 2 });
  assert.deepEqual(late.nextUniqueVisitorsMilestone, { tier: 7, threshold: 50, remaining: 4 });
  assert.deepEqual(late.activeOffers[0].requirements, [{ itemId: "ENCHANTED_CACTUS", amount: 1 }]);
  assert.equal(buildGardenProgress(null).gardenLevel, null);
  assert.equal(buildGardenProgress({}).gardenLevel, null);
  const distant = buildGardenProgress({ garden_experience: 60120,
    commission_data: { total_completed: 1900, unique_npcs_served: 300 } });
  assert.equal(distant.gardenLevel, 15);
  assert.deepEqual(distant.nextOffersMilestone, { tier: 27, threshold: 1950, remaining: 50 });
  assert.equal(distant.nextUniqueVisitorsMilestone, null);
});

test("Garden client accepts a missing profile Garden and caches a valid profile response", async () => {
  const paths: string[] = [];
  const client = new HypixelClient(async input => {
    const url = String(input);
    paths.push(url);
    return url.includes("missing") ? new Response(null, { status: 404 }) : Response.json({ success: true,
      garden: { garden_experience: 70 } });
  }, new TtlCache(), () => "fixture-key");
  assert.equal(await client.getGarden("missing"), null);
  assert.equal(buildGardenProgress(await client.getGarden("present")).gardenLevel, 2);
  await client.getGarden("present");
  assert.equal(paths.length, 2);
  assert.ok(paths.every(path => path.includes("/skyblock/garden?profile=")));
});
