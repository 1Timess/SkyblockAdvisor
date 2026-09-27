import assert from "node:assert/strict";
import test from "node:test";
import { inspectRawSlayer } from "../src/server/slayer/research-inspection";

test("Slayer research inspection exposes field shapes and whitelisted counts, not unknown values", () => {
  const result = inspectRawSlayer({ slayer_bosses: { zombie: {
    xp: 102, boss_kills_tier_0: 4, rng: { selected_drop: "SECRET_ITEM", score: 123 }, private: "SECRET",
  } }, active_quest: { id: "SECRET_QUEST" } });
  assert.deepEqual(result.families.zombie, { keys: ["boss_kills_tier_0", "private", "rng", "xp"],
    xp: 102, killsByRawTier: { boss_kills_tier_0: 4 }, nestedFieldKeys: { rng: ["score", "selected_drop"] } });
  assert.equal(result.sectionPresent, true);
  assert.ok(!JSON.stringify(result).includes("SECRET"));
  assert.deepEqual(inspectRawSlayer(undefined), { sectionPresent: false, sectionKeys: [], families: {} });
});
