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
  const enchanting = routeAdvisorQuestion({ question: "Should I do Superpairs for enchanting XP?", profile });
  assert.equal(enchanting.domain, "ENCHANTING");
  assert.equal(enchanting.scope, "ENCHANTING");
  const accessories = routeAdvisorQuestion({ question: "Give me an accessory sweep for foraging", profile });
  assert.equal(accessories.domain, "ACCESSORIES");
  assert.equal(accessories.goal, "FORAGING");
  assert.deepEqual(accessories.mechanics, ["SWEEP"]);
  const alchemy = routeAdvisorQuestion({ question: "What potion should I brew for mining?", profile });
  assert.equal(alchemy.domain, "ALCHEMY");
  assert.equal(alchemy.scope, "ALCHEMY");
  assert.equal(alchemy.goal, "ALCHEMY");
  assert.deepEqual(alchemy.activeDomains, ["ALCHEMY"]);
  assert.equal(routeAdvisorQuestion({ question: "How long will my God Potion last?", profile }).domain, "ALCHEMY");
  const carpentry = routeAdvisorQuestion({ question: "Why didn\'t this craft give Carpentry XP?", profile });
  assert.equal(carpentry.domain, "CARPENTRY");
  assert.equal(carpentry.scope, "CARPENTRY");
  assert.equal(carpentry.goal, "CARPENTRY");
  assert.deepEqual(carpentry.activeDomains, ["CARPENTRY"]);
  assert.equal(routeAdvisorQuestion({ question: "When do I unlock Quick Crafting?", profile }).domain, "CARPENTRY");
  assert.notEqual(routeAdvisorQuestion({ question: "What should I craft next?", profile }).domain, "CARPENTRY");
  const runecrafting = routeAdvisorQuestion({ question: "What Runecrafting level do I need for this rune?", profile });
  assert.equal(runecrafting.domain, "RUNECRAFTING");
  assert.equal(runecrafting.scope, "RUNECRAFTING");
  assert.equal(runecrafting.goal, "RUNECRAFTING");
  assert.deepEqual(runecrafting.activeDomains, ["RUNECRAFTING"]);
  assert.equal(routeAdvisorQuestion({ question: "How do I fuse runes?", profile }).domain, "RUNECRAFTING");
  assert.equal(routeAdvisorQuestion({ question: "How does the Runic Pedestal work?", profile }).domain, "RUNECRAFTING");
});

test("Farming and Garden questions route to the profile-wide domain", async () => {
  const profile = await fixture();
  const farming = routeAdvisorQuestion({ question: "What Farming progression should I focus on?", profile });
  assert.equal(farming.domain, "FARMING");
  assert.equal(farming.goal, "FARMING");
  assert.deepEqual(farming.activeDomains, ["FARMING"]);
  assert.equal(routeAdvisorQuestion({ question: "Which Garden visitor offers are next?", profile }).domain, "FARMING");
  assert.equal(routeAdvisorQuestion({ question: "How do I make Timestalk?", profile }).domain, "FARMING");
  assert.equal(routeAdvisorQuestion({ question: "How do I grow Witherbloom and progress toward another Greenhouse?", profile }).goal, "FARMING");
  assert.equal(routeAdvisorQuestion({ question: "Which Greenhouse mutations are possible?", profile }).domain, "FARMING");
});
