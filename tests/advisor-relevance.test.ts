import assert from "node:assert/strict";
import test from "node:test";
import type { AdvisorRoute } from "../src/schemas/advisor";
import type { AdvisorCandidate } from "../src/schemas/candidates";
import type { CandidateItem } from "../src/schemas/catalog";
import type { MarketQuote } from "../src/schemas/market";
import { buildCandidateFeasibility, selectDetailedCandidates, type TaggedCandidateLane } from "../src/server/advisor/context";
import { filterCandidateLanesForGoal } from "../src/server/advisor/relevance";
import { routeAdvisorQuestion } from "../src/server/advisor/routing";
import { prepareCandidate } from "../src/server/candidates/common";
import { parseRequirementText } from "../src/server/reference/requirements";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

function item(id: string, stats: Record<string, number>, options: Partial<CandidateItem> = {}): CandidateItem {
  return { id, name: id, rarity: "epic", categories: ["armor", "helmet"], stats, lore: [], abilityText: [], setBonusText: [],
    requirements: [], unparsedRequirementText: [], wiki: null, marketKey: id, sources: { hypixel: true, neu: true }, ...options };
}

function candidate(id: string, stat: string, value: number, options: Partial<AdvisorCandidate> = {}): AdvisorCandidate {
  const candidateItem = item(id, { [stat]: value });
  return { id, domain: "armor", item: candidateItem, knownChanges: { [stat]: { current: 0, candidate: value } },
    requirements: [], abilityText: [], setBonusText: [], warnings: [], ...options };
}

function route(goal: AdvisorRoute["goal"], inferredRole: AdvisorRoute["inferredRole"] = "berserk"): AdvisorRoute {
  return { scope: "GEAR", goal, inferredRole, activeDomains: ["ARMOR", "WEAPONS"], clarificationRecommended: false, reason: "fixture", armorSlots: [] };
}

test("explicit Intelligence overrides Berserk and excludes strength-only filler", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const detected = routeAdvisorQuestion({ question: "I want more intelligence for more Aspect of the End teleports.", profile, conversationState: { role: "berserk" } });
  const lanes: TaggedCandidateLane[] = [
    { domain: "ARMOR", label: "armor:helmet:intelligence", candidates: [candidate("INT", "intelligence", 100)] },
    { domain: "ARMOR", label: "armor:helmet:strength", candidates: [candidate("STR", "strength", 100)] },
  ];
  assert.equal(detected.goal, "INTELLIGENCE");
  assert.equal(detected.inferredRole, "berserk");
  assert.deepEqual(selectDetailedCandidates(filterCandidateLanesForGoal(lanes, detected)).map(value => value.id), ["INT"]);
});

test("Speed-only candidates survive Speed goals but not general Berserk progression", () => {
  const lanes: TaggedCandidateLane[] = [
    { domain: "ARMOR", label: "armor:helmet:speed", candidates: [candidate("SPEED", "speed", 400)] },
    { domain: "ARMOR", label: "armor:helmet:strength", candidates: [candidate("STR", "strength", 50)] },
  ];
  assert.deepEqual(selectDetailedCandidates(filterCandidateLanesForGoal(lanes, route("SPEED"))).map(value => value.id), ["SPEED"]);
  assert.deepEqual(selectDetailedCandidates(filterCandidateLanesForGoal(lanes, route("GENERAL_UPGRADE"))).map(value => value.id), ["STR"]);
});

test("relevance filtering accepts fewer than 32 and never replenishes from irrelevant lanes", () => {
  const speed = Array.from({ length: 9 }, (_, index) => candidate(`SPEED_${index}`, "speed", index + 1));
  const strength = Array.from({ length: 91 }, (_, index) => candidate(`STR_${index}`, "strength", index + 1));
  const lanes: TaggedCandidateLane[] = [
    { domain: "ARMOR", label: "armor:helmet:speed", candidates: speed },
    { domain: "ARMOR", label: "armor:helmet:strength", candidates: strength },
  ];
  assert.equal(selectDetailedCandidates(filterCandidateLanesForGoal(lanes, route("SPEED"))).length, 9);
});

test("advisor discovery retains nearby and distant locked candidates with exact gaps", async () => {
  const base = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const profile = { ...base, progression: { ...base.progression, slayers: { ...base.progression.slayers,
    enderman: { ...base.progression.slayers.enderman, level: 1 } } } };
  for (const required of [2, 7]) {
    const locked = item(`LOCKED_${required}`, { damage: 100 }, { categories: ["weapon", "sword"], requirements: [parseRequirementText(`Requires Enderman Slayer ${required}`)!] });
    assert.equal(prepareCandidate("weapon", locked, profile, new Map(), {}), null);
    const discovered = prepareCandidate("weapon", locked, profile, new Map(), { eligibilityMode: "ADVISOR_DISCOVERY" })!;
    const feasibility = buildCandidateFeasibility(discovered, profile, 30_000_000);
    assert.equal(feasibility.requirementStatus, "NOT_MET");
    assert.deepEqual(feasibility.requirements[0], { text: `Requires Enderman Slayer ${required}`, type: "SLAYER", subject: "enderman",
      current: 1, required, gap: required - 1, status: "NOT_MET" });
  }
});

test("advisor discovery retains over-budget candidates and reports price deltas", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const candidateItem = item("PRICE", { strength: 100 });
  for (const [coins, status, delta] of [[32_000_000, "OVER_BUDGET", 2_000_000], [20_000_000, "WITHIN_BUDGET", -10_000_000]] as const) {
    const quote: MarketQuote = { marketKey: "PRICE", coins, observedAt: "2026-09-23T00:00:00.000Z", basis: "LOWEST_BIN", confidence: "LOW" };
    const discovered = prepareCandidate("armor", candidateItem, profile, new Map([["PRICE", quote]]), { budgetCoins: 30_000_000, eligibilityMode: "ADVISOR_DISCOVERY" })!;
    const feasibility = buildCandidateFeasibility(discovered, profile, 30_000_000);
    assert.equal(feasibility.priceStatus, status); assert.equal(feasibility.budgetDeltaCoins, delta);
  }
  const unknown = prepareCandidate("armor", candidateItem, profile, new Map(), { budgetCoins: 30_000_000, eligibilityMode: "ADVISOR_DISCOVERY" })!;
  assert.equal(buildCandidateFeasibility(unknown, profile, 30_000_000).priceStatus, "UNKNOWN");
  assert.equal(buildCandidateFeasibility(unknown, profile, 30_000_000).budgetDeltaCoins, null);
});

test("mixed and unknown requirements preserve individual states", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const mixedItem = item("MIXED", { defense: 100 }, { requirements: [parseRequirementText("Requires Combat Skill 2")!,
    parseRequirementText("Requires The Catacombs Floor VI Completion")!] });
  const mixed = prepareCandidate("armor", mixedItem, profile, new Map(), { eligibilityMode: "ADVISOR_DISCOVERY" })!;
  const mixedFeasibility = buildCandidateFeasibility(mixed, profile);
  assert.equal(mixedFeasibility.requirementStatus, "MIXED");
  assert.deepEqual(mixedFeasibility.requirements.map(value => value.status), ["MET", "NOT_MET"]);
  const unknownItem = item("UNKNOWN", { defense: 100 }, { unparsedRequirementText: ["Requires Mysterious Access"] });
  const unknown = prepareCandidate("armor", unknownItem, profile, new Map(), { eligibilityMode: "ADVISOR_DISCOVERY" })!;
  const unknownFeasibility = buildCandidateFeasibility(unknown, profile);
  assert.equal(unknownFeasibility.requirementStatus, "UNKNOWN");
  assert.equal(unknownFeasibility.requirements[0].type, "UNKNOWN");
  assert.ok(unknown.warnings.some(warning => warning.includes("not structurally understood")));
});
