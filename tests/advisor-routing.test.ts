import assert from "node:assert/strict";
import test from "node:test";
import type { AdvisorCandidate } from "../src/schemas/candidates";
import { routeAdvisorQuestion } from "../src/server/advisor/routing";
import { scopeCandidateLanes } from "../src/server/advisor/build-live-context";
import { selectDetailedCandidates, type TaggedCandidateLane } from "../src/server/advisor/context";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

function candidate(id: string, domain: AdvisorCandidate["domain"], categories: string[] = [domain]): AdvisorCandidate {
  return { id, domain, item: { id, name: id, rarity: "rare", categories, stats: {}, lore: [], abilityText: [], setBonusText: [], requirements: [],
    unparsedRequirementText: [], wiki: null, marketKey: id, sources: { hypixel: true, neu: false } },
    requirements: [], abilityText: [], setBonusText: [], warnings: [] };
}

async function fixture() {
  return buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
}

const lanes: TaggedCandidateLane[] = [
  { domain: "ARMOR", label: "armor:helmet:defense", candidates: [candidate("HELMET", "armor")] },
  { domain: "ARMOR", label: "armor:boots:defense", candidates: [candidate("BOOTS", "armor")] },
  { domain: "WEAPONS", label: "weapon:CURRENT:damage", candidates: [candidate("SWORD", "weapon", ["weapon", "sword"]), candidate("BOW", "weapon", ["weapon", "bow"])] },
  { domain: "ACCESSORIES", label: "accessory:missing", candidates: [candidate("TALISMAN", "accessory")] },
  { domain: "PETS", label: "pet:roleProgression", candidates: [candidate("PET;4", "pet")] },
];

test("Magical Power routes to accessory details only", async () => {
  const route = routeAdvisorQuestion({ question: "How should I increase my Magical Power?", profile: await fixture() });
  const selected = selectDetailedCandidates(scopeCandidateLanes(lanes, route));
  assert.equal(route.scope, "ACCESSORIES");
  assert.equal(route.domain, "ACCESSORIES");
  assert.deepEqual(selected.map(value => value.id), ["TALISMAN"]);
});

test("pet question routes to pet details only", async () => {
  const route = routeAdvisorQuestion({ question: "What pet should I get?", profile: await fixture() });
  const selected = selectDetailedCandidates(scopeCandidateLanes(lanes, route));
  assert.equal(route.scope, "PETS");
  assert.deepEqual(selected.map(value => value.id), ["PET;4"]);
});

test("F5 progression routes to gear without accessory or pet quota filling", async () => {
  const route = routeAdvisorQuestion({ question: "I just cleared F5 and have 30m coins. What should I upgrade next?", profile: await fixture() });
  const selected = selectDetailedCandidates(scopeCandidateLanes(lanes, route));
  assert.equal(route.domain, "DUNGEONS");
  assert.deepEqual(new Set(selected.map(value => value.domain)), new Set(["armor", "weapon"]));
  assert.ok(!selected.some(value => value.domain === "accessory" || value.domain === "pet"));
});

test("specific helmet question loads only helmet armor lanes", async () => {
  const route = routeAdvisorQuestion({ question: "What helmet should I get?", profile: await fixture() });
  const selected = selectDetailedCandidates(scopeCandidateLanes(lanes, route));
  assert.equal(route.scope, "ARMOR");
  assert.deepEqual(route.armorSlots, ["helmet"]);
  assert.deepEqual(selected.map(value => value.id), ["HELMET"]);
});

test("ambiguous requests clarify while explicit and follow-up domains route", async () => {
  const profile = await fixture();
  assert.equal(routeAdvisorQuestion({ question: "What should I upgrade?", profile }).scope, "CLARIFY");
  const followUp = routeAdvisorQuestion({ question: "Okay, what about that next?", profile,
    conversationState: { currentDomain: "MINING", goal: "MINING" } });
  assert.equal(followUp.domain, "MINING");
  assert.equal(followUp.scope, "MINING");
  const archer = routeAdvisorQuestion({ question: "What bow should I get?", profile });
  assert.deepEqual(selectDetailedCandidates(scopeCandidateLanes(lanes, archer)).map(value => value.id), ["BOW"]);
});

test("profile-intelligence domains route explicitly", async () => {
  const profile = await fixture();
  assert.equal(routeAdvisorQuestion({ question: "What fishing gear should I use?", profile }).domain, "FISHING");
  assert.equal(routeAdvisorQuestion({ question: "What should I do for mining?", profile }).domain, "MINING");
  const accessories = routeAdvisorQuestion({ question: "Give me an accessory sweep for foraging", profile });
  assert.equal(accessories.domain, "ACCESSORIES");
  assert.equal(accessories.goal, "FORAGING");
  assert.deepEqual(accessories.mechanics, ["SWEEP"]);
});
