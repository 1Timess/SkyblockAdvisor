import assert from "node:assert/strict";
import test from "node:test";
import { buildPetLevelBucketSpecs } from "../src/server/pets/level-buckets";

test("level 100 pet keeps exact endpoints and four proportional intermediate bands", () => {
  assert.deepEqual(buildPetLevelBucketSpecs(100), [
    { minLevel: 1, maxLevel: 1 },
    { minLevel: 2, maxLevel: 25 },
    { minLevel: 26, maxLevel: 50 },
    { minLevel: 51, maxLevel: 74 },
    { minLevel: 75, maxLevel: 99 },
    { minLevel: 100, maxLevel: 100 },
  ]);
});

test("level 200 pet scales the same policy without hardcoded level thresholds", () => {
  assert.deepEqual(buildPetLevelBucketSpecs(200), [
    { minLevel: 1, maxLevel: 1 },
    { minLevel: 2, maxLevel: 50 },
    { minLevel: 51, maxLevel: 100 },
    { minLevel: 101, maxLevel: 149 },
    { minLevel: 150, maxLevel: 199 },
    { minLevel: 200, maxLevel: 200 },
  ]);
});

test("small max levels remain contiguous with no empty or overlapping bands", () => {
  assert.deepEqual(buildPetLevelBucketSpecs(5), [
    { minLevel: 1, maxLevel: 1 },
    { minLevel: 2, maxLevel: 2 },
    { minLevel: 3, maxLevel: 3 },
    { minLevel: 4, maxLevel: 4 },
    { minLevel: 5, maxLevel: 5 },
  ]);
});

test("custom intermediate resolution remains deterministic", () => {
  assert.deepEqual(buildPetLevelBucketSpecs(10, 2), [
    { minLevel: 1, maxLevel: 1 },
    { minLevel: 2, maxLevel: 5 },
    { minLevel: 6, maxLevel: 9 },
    { minLevel: 10, maxLevel: 10 },
  ]);
});

test("invalid bucket inputs fail loudly", () => {
  assert.throws(() => buildPetLevelBucketSpecs(0));
  assert.throws(() => buildPetLevelBucketSpecs(100, 0));
});
