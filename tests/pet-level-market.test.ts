import assert from "node:assert/strict";
import test from "node:test";
import { buildPetLevelBuckets } from "../src/server/pets/level-market";
import type { PetMarketListing } from "../src/schemas/pet-market";

const listing = (id: string, level: number, coins: number, pet = "GOLDEN_DRAGON;4"): PetMarketListing => ({
  listingId: id, canonicalPetId: pet, level, coins, observedAt: null, source: "TEST",
});

test("buckets only listings from the same concrete pet rarity", () => {
  const buckets = buildPetLevelBuckets("GOLDEN_DRAGON;4", [
    listing("a", 20, 120), listing("b", 30, 130), listing("wrong", 25, 1, "GOLDEN_DRAGON;3"),
  ], [{ minLevel: 1, maxLevel: 50 }]);
  assert.equal(buckets[0].sampleCount, 2);
  assert.notEqual(buckets[0].representative?.listingId, "wrong");
});

test("uses lower median rather than a single anomalously cheap listing", () => {
  const buckets = buildPetLevelBuckets("GOLDEN_DRAGON;4", [
    listing("outlier", 40, 1), listing("a", 42, 100), listing("b", 45, 110), listing("c", 49, 120),
  ], [{ minLevel: 1, maxLevel: 50 }]);
  assert.equal(buckets[0].representative?.coins, 100);
  assert.equal(buckets[0].confidence, "MEDIUM");
});

test("empty and singleton buckets preserve sparse-market uncertainty", () => {
  const buckets = buildPetLevelBuckets("GOLDEN_DRAGON;4", [listing("one", 80, 200)], [
    { minLevel: 1, maxLevel: 50 }, { minLevel: 51, maxLevel: 100 },
  ]);
  assert.equal(buckets[0].representative, null);
  assert.equal(buckets[0].confidence, "LOW");
  assert.equal(buckets[1].sampleCount, 1);
  assert.equal(buckets[1].confidence, "LOW");
});

test("deterministic representative selection breaks equal-price ties by higher level", () => {
  const buckets = buildPetLevelBuckets("GOLDEN_DRAGON;4", [
    listing("a", 20, 100), listing("b", 30, 100), listing("c", 40, 200),
  ], [{ minLevel: 1, maxLevel: 50 }]);
  assert.equal(buckets[0].representative?.listingId, "b");
});
