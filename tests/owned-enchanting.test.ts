import assert from "node:assert/strict";
import test from "node:test";
import { memberSchema } from "../src/server/hypixel/types";
import { buildOwnedEnchantingState } from "../src/server/enchanting/owned-state";

test("preserves distinct Experimentation sections without inferring charge availability", () => {
  const member = memberSchema.parse({
    player_data: { experience: { SKILL_ENCHANTING: 9_925 } },
    experimentation: { simon: { last_attempt: 0, bonus_clicks: 2, attempts_0: 15, best_score_0: 23 },
      numbers: { claims_1: 4 }, pairings: { last_claimed: 2 }, charges: 3,
      charge_track_timestamp: 1_789_949_055_186, serums_drank: 3, claimed_retroactive_rng: true },
  });
  const state = buildOwnedEnchantingState(member);
  assert.deepEqual(state.skill, { xp: 9_925, level: 10 });
  assert.equal(state.experimentation.status, "PRESENT");
  assert.equal(state.experimentation.serumsDrank, 3);
  assert.deepEqual(state.experimentation.history.chronomatron.attempts, { "0": 15 });
  assert.deepEqual(state.experimentation.history.chronomatron.bestScores, { "0": 23 });
  assert.deepEqual(state.experimentation.history.ultrasequencer.claims, { "1": 4 });
  assert.equal("chargeTrackTimestamp" in state.experimentation, false);
  assert.equal("lastClaimed" in state.experimentation.history.chronomatron, false);
});

test("missing or malformed source state never becomes level zero or owned upgrades", () => {
  const missing = buildOwnedEnchantingState(memberSchema.parse({}));
  assert.equal(missing.skill, null);
  assert.equal(missing.experimentation.status, "ABSENT");
  assert.equal(missing.experimentation.serumsDrank, null);
  const malformed = buildOwnedEnchantingState(memberSchema.parse({ experimentation: ["unexpected"] }));
  assert.equal(malformed.experimentation.status, "MALFORMED");
  assert.equal(malformed.experimentation.serumsDrank, null);
});
