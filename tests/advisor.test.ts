import assert from "node:assert/strict";
import test from "node:test";
import type { AdvisorCandidate } from "../src/schemas/candidates";
import { buildAdvisorContext, selectCompactCandidates, type CandidateLaneGroups } from "../src/server/advisor/context";
import { validateAdvisorResponse } from "../src/server/advisor/validate-response";
import { callLunaAdvisor } from "../src/server/advisor/luna";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

function candidate(id: string, domain: AdvisorCandidate["domain"]): AdvisorCandidate {
  return { id, domain, item: { id, name: id, rarity: "rare", categories: [domain], stats: {}, lore: ["omitted from context"], abilityText: [], setBonusText: [],
    requirements: [], unparsedRequirementText: [], wiki: null, marketKey: id, sources: { hypixel: true, neu: false } },
    requirements: [], abilityText: [], setBonusText: [], warnings: [] };
}
function groups(): CandidateLaneGroups {
  return { armor: [[candidate("ARMOR_A", "armor"), candidate("SHARED", "armor")]], weapon: [[candidate("WEAPON_A", "weapon"), candidate("SHARED", "weapon")]],
    accessory: [[candidate("ACCESSORY_A", "accessory")]], pet: [[candidate("PET_A", "pet")]] };
}

test("compact selection round-robins domains, deduplicates IDs, and respects the cap", () => {
  assert.deepEqual(selectCompactCandidates(groups(), 4).map(value => value.id), ["ARMOR_A", "WEAPON_A", "ACCESSORY_A", "PET_A"]);
  assert.equal(new Set(selectCompactCandidates(groups()).map(value => value.id)).size, 5);
});

test("advisor context keeps decision facts and candidate IDs while dropping full lore", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const context = buildAdvisorContext({ question: "What should I upgrade?", profile, candidateLanes: groups() });
  assert.equal(context.question, "What should I upgrade?");
  assert.deepEqual(context.candidates.map(value => value.id), ["ARMOR_A", "WEAPON_A", "ACCESSORY_A", "PET_A", "SHARED"]);
  assert.equal("lore" in context.candidates[0], false);
  assert.equal(context.currentGear.magicalPower, profile.accessories.magicalPower.total);
});

test("advisor response validation preserves only supplied IDs and contiguous order", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const context = buildAdvisorContext({ question: "What should I upgrade?", profile, candidateLanes: groups() });
  const valid = { headline: "Plan", actions: [{ rank: 1, candidateId: "WEAPON_A", action: "Buy it", why: "Known improvement", tradeoffs: [], prerequisites: [], uncertainty: null }], caveats: [] };
  assert.deepEqual(validateAdvisorResponse(valid, context), valid);
  assert.throws(() => validateAdvisorResponse({ ...valid, actions: [{ ...valid.actions[0], candidateId: "INVENTED" }] }, context), /unknown candidate ID/);
  assert.throws(() => validateAdvisorResponse({ ...valid, actions: [{ ...valid.actions[0], rank: 2 }] }, context), /contiguous/);
});

test("Luna client sends a strict structured request and validates the returned candidate IDs", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const context = buildAdvisorContext({ question: "What should I upgrade?", profile, candidateLanes: groups() });
  const advice = { headline: "Plan", actions: [{ rank: 1, candidateId: "WEAPON_A", action: "Upgrade", why: "Matches the goal", tradeoffs: [], prerequisites: [], uncertainty: null }], caveats: [] };
  let request: RequestInit | undefined;
  const fetcher = async (_input: string | URL | Request, init?: RequestInit) => {
    request = init;
    return new Response(JSON.stringify({ id: "resp_fixture", model: "gpt-6-luna", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(advice) }] }],
      usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const result = await callLunaAdvisor(context, fetcher, "test-token");
  assert.deepEqual(result.advice, advice); assert.equal(result.meta.totalTokens, 120); assert.equal(result.meta.estimatedCostUsd, 0.00002);
  const body = JSON.parse(String(request?.body));
  assert.equal(body.model, "gpt-6-luna"); assert.equal(body.store, false); assert.equal(body.text.format.strict, true);
  assert.equal(JSON.parse(body.input).candidates[0].id, "ARMOR_A");
  assert.equal(new Headers(request?.headers).get("Authorization"), "Bearer test-token");
});

test("Luna client rejects response IDs outside the deterministic shortlist", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const context = buildAdvisorContext({ question: "What should I upgrade?", profile, candidateLanes: groups() });
  const fetcher = async () => new Response(JSON.stringify({ id: "resp_fixture", model: "gpt-6-luna", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({
    headline: "Plan", actions: [{ rank: 1, candidateId: "INVENTED", action: "Upgrade", why: "No", tradeoffs: [], prerequisites: [], uncertainty: null }], caveats: [],
  }) }] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  await assert.rejects(callLunaAdvisor(context, fetcher, "test-token"), /unknown candidate ID/);
});
