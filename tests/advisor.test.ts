import assert from "node:assert/strict";
import test from "node:test";
import type { AdvisorCandidate } from "../src/schemas/candidates";
import type { AdvisorRoute, AvailableAnalysis } from "../src/schemas/advisor";
import { buildAdvisorContext, compactProfileWarnings, selectDetailedCandidates } from "../src/server/advisor/context";
import { validateAdvisorResponse } from "../src/server/advisor/validate-response";
import { callLunaAdvisor } from "../src/server/advisor/luna";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { buildActivityDomainLanes } from "../src/server/candidates/domain";
import { fixtureSources } from "./fixtures/profile";

function candidate(id: string, domain: AdvisorCandidate["domain"], current?: number, target?: number): AdvisorCandidate {
  return { id, domain, item: { id, name: id, rarity: "rare", categories: [domain], stats: {}, lore: ["omitted from context"], abilityText: [], setBonusText: [],
    requirements: [], unparsedRequirementText: [], wiki: null, marketKey: id, sources: { hypixel: true, neu: false } },
    knownChanges: current === undefined ? undefined : { level: { current, candidate: target ?? current } },
    requirements: [], abilityText: [], setBonusText: [], warnings: [] };
}
const available: AvailableAnalysis = {
  armor: { available: true, candidateCount: 2 }, weapons: { available: true, candidateCount: 2 },
  accessories: { available: true, candidateCount: 3, currentMagicalPower: 100, missingCount: 2, upgradeCount: 1 },
  pets: { available: true, candidateCount: 1, ownedCount: 2 },
  dungeons: { available: true, candidateCount: 4 }, fishing: { available: true, candidateCount: 0 }, mining: { available: true, candidateCount: 0 },
};
const route: AdvisorRoute = { scope: "GEAR", goal: "GENERAL_UPGRADE", inferredRole: "berserk", activeDomains: ["ARMOR", "WEAPONS"], clarificationRecommended: false, reason: "fixture", armorSlots: [], domain: "DUNGEONS", mechanics: [] };

async function context() {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  return buildAdvisorContext({ question: "What should I upgrade?", profile, route, availableAnalysis: available,
    candidates: [candidate("ARMOR_A", "armor"), candidate("WEAPON_A", "weapon")] });
}

test("detailed selection does not fill its active scope with unrelated candidates", () => {
  const active = Array.from({ length: 9 }, (_, index) => candidate(`A${index}`, "armor"));
  const selected = selectDetailedCandidates([{ domain: "ARMOR", label: "armor:helmet:defense", candidates: active }]);
  assert.equal(selected.length, 9);
  assert.ok(selected.every(value => value.domain === "armor"));
});

test("detailed selection caps 100 relevant candidates at 32", () => {
  const active = Array.from({ length: 100 }, (_, index) => candidate(`A${index}`, "armor"));
  assert.equal(selectDetailedCandidates([{ domain: "ARMOR", label: "armor:helmet:defense", candidates: active }]).length, 32);
});

test("no-op pet state does not consume detailed candidate capacity", () => {
  const selected = selectDetailedCandidates([{ domain: "PETS", label: "pet:owned", candidates: [candidate("LION;4", "pet", 90, 90), candidate("RABBIT;4", "pet", 70, 100)] }]);
  assert.deepEqual(selected.map(value => value.id), ["RABBIT;4"]);
});

test("advisor warning context compacts diagnostic parser warnings", () => {
  const warnings = [
    ...Array.from({ length: 82 }, (_, index) => ({ code: "UNKNOWN_ITEM_STAT" as const, message: `stat ${index}` })),
    ...Array.from({ length: 79 }, (_, index) => ({ code: "UNKNOWN_ITEM_CATEGORY" as const, message: `category ${index}` })),
    { code: "PARTIAL_PROFILE" as const, message: "Profile is partial." },
  ];
  assert.deepEqual(compactProfileWarnings(warnings), ["Profile is partial.", "Profile normalization encountered 82 unknown stat labels and 79 unknown item categories; raw item text was preserved."]);
});

test("advisor context contains canonical plus only the routed domain payload", async () => {
  const advisorContext = await context();
  assert.equal(advisorContext.canonical.identity.username, "FixturePlayer");
  assert.equal(advisorContext.domainContext?.domain, "DUNGEONS");
  assert.equal("ACCESSORIES" in (advisorContext.domainContext ?? {}), false);
  assert.equal(JSON.stringify(advisorContext).includes('"domain":"FISHING"'), false);
});

test("budget feasibility reports relative overage", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const priced = { ...candidate("PRICE", "weapon"), price: { coins: 31_000_000, observedAt: new Date(0).toISOString(), confidence: "HIGH" as const } };
  const { buildCandidateFeasibility } = await import("../src/server/advisor/context");
  assert.equal(buildCandidateFeasibility(priced, profile, 30_000_000).overBudgetPercent, 100 / 30);
  assert.equal(buildCandidateFeasibility({ ...priced, price: { ...priced.price, coins: 2_000_000 } }, profile, 1_000_000).overBudgetPercent, 100);
});

test("CLARIFICATION validates without purchase candidates", async () => {
  const advisorContext = await context();
  const response = { kind: "CLARIFICATION", question: "Which role do you play?", whyNeeded: "It changes the gear choice.",
    suggestedAnswers: ["Mage", "Archer", "Berserk"], availableAnalysis: available };
  assert.deepEqual(validateAdvisorResponse(response, advisorContext), response);
});

test("PLAN enforces semantic action IDs and contiguous ranks", async () => {
  const advisorContext = await context();
  const valid = { kind: "PLAN", headline: "Plan", actions: [{ rank: 1, actionType: "BUY", candidateId: "WEAPON_A", action: "Buy it",
    why: "Known improvement", tradeoffs: [], prerequisites: [], uncertainty: null }], caveats: [],
    followUps: [{ domain: "ACCESSORIES", label: "Check accessories", reason: "Analysis is available." }] };
  assert.deepEqual(validateAdvisorResponse(valid, advisorContext), valid);
  assert.throws(() => validateAdvisorResponse({ ...valid, actions: [{ ...valid.actions[0], candidateId: "INVENTED" }] }, advisorContext), /unknown candidate ID/);
  assert.throws(() => validateAdvisorResponse({ ...valid, actions: [{ ...valid.actions[0], candidateId: null }] }, advisorContext), /BUY actions require/);
  assert.throws(() => validateAdvisorResponse({ ...valid, actions: [{ ...valid.actions[0], rank: 2 }] }, advisorContext), /contiguous/);
  assert.throws(() => validateAdvisorResponse({ ...valid, actions: [{ ...valid.actions[0], actionType: "HOLD", candidateId: "WEAPON_A" }] }, advisorContext), /HOLD actions/);
  assert.throws(() => validateAdvisorResponse({ ...valid, followUps: [{ domain: "SKILLS", label: "Skills", reason: "No" }] }, advisorContext));
});

test("prerequisite-first and hold-only plans are valid", async () => {
  const advisorContext = await context();
  const prerequisite = { kind: "PLAN", headline: "Unlock first", actions: [
    { rank: 1, actionType: "PROGRESSION", candidateId: null, action: "Complete the prerequisite", why: "The candidate is locked", tradeoffs: [], prerequisites: [], uncertainty: null },
    { rank: 2, actionType: "BUY", candidateId: "WEAPON_A", action: "Buy after unlocking", why: "Then it is usable", tradeoffs: [], prerequisites: ["Complete the prerequisite"], uncertainty: null },
  ], caveats: [], followUps: [] };
  assert.deepEqual(validateAdvisorResponse(prerequisite, advisorContext), prerequisite);
  const hold = { kind: "PLAN", headline: "Keep saving", actions: [
    { rank: 1, actionType: "HOLD", candidateId: null, action: "Hold coins", why: "No supplied candidate justifies spending", tradeoffs: [], prerequisites: [], uncertainty: null },
  ], caveats: [], followUps: [{ domain: "PETS", label: "Inspect pets", reason: "Another domain may be more productive." }] };
  assert.deepEqual(validateAdvisorResponse(hold, advisorContext), hold);
});

test("Luna client sends the scoped strict request and validates its response", async () => {
  const advisorContext = await context();
  const advice = { kind: "PLAN", headline: "Plan", actions: [{ rank: 1, actionType: "HOLD", candidateId: null, action: "Save coins", why: "Uncertainty",
    tradeoffs: [], prerequisites: [], uncertainty: null }], caveats: [], followUps: [{ domain: "PETS", label: "Inspect pets", reason: "Pet analysis is available." }] };
  let request: RequestInit | undefined;
  const fetcher = async (_input: string | URL | Request, init?: RequestInit) => {
    request = init;
    return new Response(JSON.stringify({ id: "resp_fixture", model: "gpt-6-luna", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(advice) }] }],
      usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const result = await callLunaAdvisor(advisorContext, fetcher, "test-token");
  assert.deepEqual(result.advice, advice);
  const body = JSON.parse(String(request?.body));
  assert.equal(body.model, "gpt-6-luna"); assert.equal(body.store, false); assert.equal(body.text.format.strict, true);
  assert.equal(body.text.format.schema.type, "object");
  assert.deepEqual(body.text.format.schema.properties.kind.enum, ["CLARIFICATION", "PLAN"]);
  assert.ok(body.text.format.schema.required.includes("actions"));
  assert.equal(JSON.parse(body.input).route.scope, "GEAR");
  assert.equal(new Headers(request?.headers).get("Authorization"), "Bearer test-token");
});

test("Luna client reports sanitized error response bodies", async () => {
  const advisorContext = await context();
  const fetcher = async () => new Response('{"error":{"message":"invalid request for test-token"}}', { status: 400 });
  await assert.rejects(callLunaAdvisor(advisorContext, fetcher, "test-token"), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /status 400/);
    assert.match(error.message, /invalid request for \[REDACTED\]/);
    assert.doesNotMatch(error.message, /test-token/);
    return true;
  });
});

test("Mining candidates preserve same-family stat regressions for Luna", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.inventoryItems.push({
    id: "CURRENT_DRILL", uuid: "current-drill-fixture", name: "Current Drill", source: "inventory", count: 1, rarity: "epic",
    categories: ["tool", "drill"], stats: { miningSpeed: 500, miningFortune: 63, gemstoneFortune: 100, pristine: 1.5 },
    reforge: null, enchantments: {}, stars: null, recombobulated: false, lore: [], abilityText: [], setBonusText: [],
  });
  const catalog = [{
    id: "TRADEOFF_DRILL", name: "Tradeoff Drill", rarity: "epic" as const, categories: ["tool", "drill"],
    stats: { miningSpeed: 750 }, lore: [], abilityText: [], setBonusText: [], requirements: [], unparsedRequirementText: [],
    wiki: null, marketKey: "TRADEOFF_DRILL", sources: { hypixel: true, neu: true },
  }];
  const lanes = buildActivityDomainLanes({ domain: "MINING", profile, catalog, quotes: new Map(), budgetCoins: 30_000_000 });
  const tradeoff = Object.values(lanes).flat().find(value => value.id === "TRADEOFF_DRILL");
  assert.ok(tradeoff);
  assert.deepEqual(tradeoff.knownChanges, {
    miningSpeed: { current: 500, candidate: 750 },
    miningFortune: { current: 63, candidate: 0 },
    gemstoneFortune: { current: 100, candidate: 0 },
    pristine: { current: 1.5, candidate: 0 },
  });
});


test("Mining discovery emits owned-item gemstone upgrades alongside replacements", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.inventoryItems.push({
    id: "DIVAN_LEGGINGS", uuid: "divan-leggings-fixture", name: "Jaded Leggings of Divan", source: "loadout:armor:1:leggings",
    count: 1, rarity: "legendary", categories: ["armor", "leggings"], stats: { miningSpeed: 241, miningFortune: 55 },
    reforge: "jaded", enchantments: {}, stars: null, recombobulated: false, lore: [], abilityText: [], setBonusText: [],
    gemstones: { source: "NBT", slots: [
      { id: "AMBER_0", slotType: "AMBER", status: "FILLED", gemstoneType: "AMBER", quality: "FLAWLESS", unlockMethod: "GEMSTONE_CHAMBER" },
      { id: "JADE_0", slotType: "JADE", status: "LOCKED", gemstoneType: null, quality: null, unlockMethod: "GEMSTONE_CHAMBER" },
      { id: "AMBER_1", slotType: "AMBER", status: "FILLED", gemstoneType: "AMBER", quality: "FLAWLESS", unlockMethod: "GEMSTONE_CHAMBER" },
      { id: "JADE_1", slotType: "JADE", status: "LOCKED", gemstoneType: null, quality: null, unlockMethod: "GEMSTONE_CHAMBER" },
      { id: "TOPAZ_0", slotType: "TOPAZ", status: "UNLOCKED_EMPTY", gemstoneType: null, quality: null, unlockMethod: "GEMSTONE_CHAMBER" },
    ] },
  });
  profile.progression.mining.hotmLevel = 7;
  const lanes = buildActivityDomainLanes({ domain: "MINING", profile, catalog: [], quotes: new Map() });
  assert.ok(lanes.miningFortune.some(value => value.id.includes(":JADE_0:PERFECT")));
  assert.ok(lanes.miningFortune.some(value => value.id.includes(":JADE_1:PERFECT")));
  assert.ok(lanes.pristine.some(value => value.id.includes(":TOPAZ_0:PERFECT")));
  assert.ok(lanes.miningSpeed.some(value => value.id.includes(":AMBER_0:PERFECT")));
  assert.ok(lanes.miningSpeed.some(value => value.id.includes(":AMBER_1:PERFECT")));
  const topaz = lanes.pristine.find(value => value.id.includes(":TOPAZ_0:PERFECT"));
  assert.ok(topaz?.warnings.some(warning => warning.includes("unlocked but empty")));
});
