import assert from "node:assert/strict";
import test from "node:test";
import type { AdvisorCandidate } from "../src/schemas/candidates";
import { buildAdvisorContext, selectCompactCandidates, type CandidateLaneGroups } from "../src/server/advisor/context";
import { validateAdvisorResponse } from "../src/server/advisor/validate-response";
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
