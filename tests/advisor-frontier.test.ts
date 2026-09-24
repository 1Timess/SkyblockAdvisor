import assert from "node:assert/strict";
import test from "node:test";
import type { CompactAdvisorCandidate, AdvisorRoute } from "../src/schemas/advisor";
import type { AdvisorCandidate } from "../src/schemas/candidates";
import type { FrontierInputCandidate } from "../src/server/advisor/frontier";
import { selectProgressionFrontier } from "../src/server/advisor/frontier";

const route: AdvisorRoute = { scope: "GEAR", activeDomains: ["ARMOR", "WEAPONS"], clarificationRecommended: false,
  reason: "fixture", goal: "GENERAL_UPGRADE", inferredRole: "berserk", armorSlots: [] };

function input(id: string, options: {
  domain?: AdvisorCandidate["domain"]; slot?: string; category?: string; stats?: string[]; priceStatus?: CompactAdvisorCandidate["feasibility"]["priceStatus"];
  budgetDeltaCoins?: number | null; requirements?: CompactAdvisorCandidate["feasibility"]["requirements"];
} = {}, stableOrder = 0): FrontierInputCandidate {
  const domain = options.domain ?? "armor", stats = options.stats ?? ["strength"];
  const requirements = options.requirements ?? [];
  const candidate: AdvisorCandidate = { id, domain, item: { id, name: id, rarity: "epic",
    categories: domain === "armor" ? ["armor", options.slot ?? "helmet"] : ["weapon", options.category ?? "sword"],
    stats: Object.fromEntries(stats.map(stat => [stat, 1])), lore: [], abilityText: [], setBonusText: [], requirements: [],
    unparsedRequirementText: [], wiki: null, marketKey: id, sources: { hypixel: true, neu: true } },
    requirements: requirements.map(value => value.text), abilityText: [], setBonusText: [], warnings: [] };
  const priceStatus = options.priceStatus ?? "WITHIN_BUDGET";
  return { candidate, stableOrder, relevance: { reason: "fixture", relevantStats: stats }, sourceLanes: [`${domain}:fixture:${stats[0]}`],
    feasibility: { priceStatus, budgetCoins: 30_000_000,
      priceCoins: options.budgetDeltaCoins == null ? priceStatus === "UNKNOWN" ? null : 1_000_000 : 30_000_000 + options.budgetDeltaCoins,
      budgetDeltaCoins: options.budgetDeltaCoins ?? (priceStatus === "UNKNOWN" ? null : -29_000_000),
      requirementStatus: requirements.some(value => value.status === "UNKNOWN") ? "UNKNOWN" : requirements.some(value => value.status === "NOT_MET") ? "NOT_MET" : "MET",
      requirements } };
}

function requirement(type: CompactAdvisorCandidate["feasibility"]["requirements"][number]["type"], subject: string, current: number, required: number) {
  return { text: `${type} ${subject} ${required}`, type, subject, current, required, gap: required - current, status: "NOT_MET" as const };
}

function ids(candidates: FrontierInputCandidate[]) { return selectProgressionFrontier({ route, candidates }).selected.map(value => value.candidate.id); }

test("money-gated context priority follows positive budget distance", () => {
  assert.deepEqual(ids([168, 40, 32].map((millions, index) => input(`${millions}M`, { priceStatus: "OVER_BUDGET", budgetDeltaCoins: (millions - 30) * 1_000_000 }, index))), ["32M", "40M", "168M"]);
});

test("same Slayer-family gaps use their real numeric distance", () => {
  assert.deepEqual(ids([7, 4, 2].map((required, index) => input(`E${required}`, { requirements: [requirement("SLAYER", "enderman", 1, required)] }, index))), ["E2", "E4", "E7"]);
});

test("same skill-family gaps use their real numeric distance", () => {
  assert.deepEqual(ids([42, 32, 26].map((required, index) => input(`C${required}`, { requirements: [requirement("SKILL", "combat", 25, required)] }, index))), ["C26", "C32", "C42"]);
});

test("known feasibility receives context before unknown critical requirements", () => {
  const unknown = input("UNKNOWN", { priceStatus: "UNKNOWN", requirements: [{ text: "Unknown access", type: "UNKNOWN", subject: null, current: null, required: null, gap: null, status: "UNKNOWN" }] }, 0);
  assert.deepEqual(ids([unknown, input("KNOWN", {}, 1)]), ["KNOWN", "UNKNOWN"]);
});

test("redundant distant armor is capped and armor slots remain represented", () => {
  const candidates = ["helmet", "chestplate", "leggings", "boots"].flatMap((slot, slotIndex) =>
    Array.from({ length: 5 }, (_, index) => input(`${slot}-${index}`, { slot, priceStatus: "UNKNOWN" }, slotIndex * 5 + index)));
  const selected = selectProgressionFrontier({ route, candidates }).selected;
  assert.equal(selected.length, 4);
  assert.deepEqual(new Set(selected.map(value => value.candidate.item.categories[1])), new Set(["helmet", "chestplate", "leggings", "boots"]));
});

test("an aspirational option survives without allowing a distant flood", () => {
  const candidates = Array.from({ length: 20 }, (_, index) => input(`DISTANT-${index}`, { slot: ["helmet", "chestplate", "leggings", "boots"][index % 4],
    stats: [`stat-${Math.floor(index / 4)}`], priceStatus: "UNKNOWN" }, index));
  const result = selectProgressionFrontier({ route, candidates });
  assert.ok(result.selected.some(value => value.selection.bucket === "DISTANT_OR_UNCERTAIN"));
  assert.ok(result.selected.filter(value => value.selection.bucket === "DISTANT_OR_UNCERTAIN").length <= 4);
});

test("the final ceiling is not a target", () => {
  const slots = ["helmet", "chestplate", "leggings", "boots"];
  assert.equal(selectProgressionFrontier({ route, candidates: Array.from({ length: 7 }, (_, index) =>
    input(`A${index}`, { slot: slots[index % slots.length], stats: [`stat-${index}`] }, index)) }).selected.length, 7);
});

test("money and progression representatives enter before a distant mixed candidate", () => {
  const candidates = [
    input("C", { priceStatus: "UNKNOWN", requirements: [requirement("SKILL", "combat", 25, 42)] }, 0),
    input("B", { requirements: [requirement("SLAYER", "enderman", 1, 2)] }, 1),
    input("A", { priceStatus: "OVER_BUDGET", budgetDeltaCoins: 2_000_000 }, 2),
  ];
  assert.deepEqual(ids(candidates), ["A", "B", "C"]);
});
