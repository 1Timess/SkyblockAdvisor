import assert from "node:assert/strict";
import test from "node:test";
import { chooseAffordablePetAnchor, resolvePetAcquisitionEnvelope } from "../src/server/pets/acquisition-market";

const quote = (key: string, coins: number) => ({ key, coins, observedAt: null, source: "TEST", confidence: "HIGH" as const });

test("indexes low and max level prices for the same concrete rarity", async () => {
  const envelope = await resolvePetAcquisitionEnvelope("GOLDEN_DRAGON;4", 200, {
    async quotePetAtLevel(id, level) { return quote(`pet:${id}:level:${level}`, level === 1 ? 100_000_000 : 450_000_000); },
  });
  assert.equal(envelope.lowLevelQuote?.coins, 100_000_000);
  assert.equal(envelope.maxLevelQuote?.coins, 450_000_000);
  assert.equal(envelope.maxLevel, 200);
});

test("held item composes onto pet price instead of changing pet market identity", async () => {
  const envelope = await resolvePetAcquisitionEnvelope("GOLDEN_DRAGON;4", 200, {
    async quotePetAtLevel(id, level) { return quote(`pet:${id}:level:${level}`, level === 1 ? 100_000_000 : 450_000_000); },
  });
  const selected = chooseAffordablePetAnchor(envelope, 500_000_000, quote("item:PET_ITEM_TIER_BOOST", 50_000_000));
  assert.deepEqual(selected, { level: 200, petCoins: 450_000_000, heldItemCoins: 50_000_000, totalCoins: 500_000_000 });
});

test("budget falls back to low-level anchor when max-level setup is unaffordable", async () => {
  const envelope = await resolvePetAcquisitionEnvelope("GOLDEN_DRAGON;4", 200, {
    async quotePetAtLevel(id, level) { return quote(`pet:${id}:level:${level}`, level === 1 ? 100_000_000 : 450_000_000); },
  });
  assert.equal(chooseAffordablePetAnchor(envelope, 300_000_000)?.level, 1);
});

test("does not invent a price when an endpoint is missing", async () => {
  const envelope = await resolvePetAcquisitionEnvelope("GOLDEN_DRAGON;4", 200, {
    async quotePetAtLevel(id, level) { return level === 1 ? quote(`pet:${id}:level:1`, 100_000_000) : null; },
  });
  const selected = chooseAffordablePetAnchor(envelope, 1_000_000_000);
  assert.equal(selected?.level, 1);
  assert.equal(envelope.maxLevelQuote, null);
});
