import assert from "node:assert/strict";
import test from "node:test";
import { memberSchema } from "../src/server/hypixel/types";
import { buildOwnedEnchantingState } from "../src/server/enchanting/owned-state";

test("preserves distinct Experimentation sections without inferring charge availability", () => {
  const member = memberSchema.parse({
    player_data: { experience: { SKILL_ENCHANTING: 9_925 } },
    experimentation: { simon: { last_attempt: 1, bonus_clicks: 2 },
      numbers: { claims_1: 4 }, pairings: { last_claimed: 2 }, charges: 3 },
  });
  const state = buildOwnedEnchantingState(member);
  assert.deepEqual(state.skill, { xp: 9_925, level: 10 });
  assert.equal(state.experimentation.status, "PRESENT");
  assert.deepEqual(state.experimentation.sections.chronomatron, ["bonus_clicks", "last_attempt"]);
  assert.deepEqual(state.experimentation.sections.ultrasequencer, ["claims_1"]);
  assert.deepEqual(state.experimentation.sections.superpairs, ["last_claimed"]);
  assert.ok(state.experimentation.keys.includes("charges"));
  assert.equal(state.experimentation.attemptAvailability, "UNKNOWN");
});

test("missing or malformed source state never becomes level zero or available attempt", () => {
  const missing = buildOwnedEnchantingState(memberSchema.parse({}));
  assert.equal(missing.skill, null);
  assert.equal(missing.experimentation.status, "ABSENT");
  assert.equal(missing.experimentation.attemptAvailability, "UNKNOWN");
  const malformed = buildOwnedEnchantingState(memberSchema.parse({ experimentation: ["unexpected"] }));
  assert.equal(malformed.experimentation.status, "MALFORMED");
  assert.deepEqual(malformed.experimentation.keys, []);
});
