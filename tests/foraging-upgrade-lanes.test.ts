import assert from "node:assert/strict";
import test from "node:test";
import { buildForagingUpgradeLanes } from "../src/server/foraging/upgrade-lanes";
import type { CandidateItem } from "../src/schemas/catalog";
import type { NormalizedSkyBlockProfile } from "../src/schemas/normalized-profile";

function candidate(id: string, stats: Record<string, number>): CandidateItem {
  return { id, name: id, rarity: "rare", categories: id.includes("ARMOR") ? ["armor", id.endsWith("HELMET") ? "helmet" : id.endsWith("BOOTS") ? "boots" : id.endsWith("LEGGINGS") ? "leggings" : "chestplate"] : ["tool", "axe"],
    stats, lore: [], abilityText: [], setBonusText: [], requirements: [], unparsedRequirementText: [], wiki: null, marketKey: id,
    sources: { hypixel: true, neu: true } };
}
function profile(items: Array<{ id: string; stats: Record<string, number>; categories?: string[] }>) {
  return { inventoryItems: items.map(item => ({ id: item.id, stats: item.stats, categories: item.categories ?? [] })) } as unknown as NormalizedSkyBlockProfile;
}

test("discovers only later supported axe-family upgrades", () => {
  const catalog = [candidate("SERIOUSLY_DAMAGED_AXE", { sweep: 10 }), candidate("FIG_AXE", { sweep: 15 }),
    candidate("FIGSTONE_AXE", { sweep: 25 }), candidate("HELIX_CHOPPER", { sweep: 50 }), candidate("UNRELATED_AXE", { sweep: 999 })];
  const lanes = buildForagingUpgradeLanes({ profile: profile([{ id: "FIG_AXE", stats: { sweep: 15 } }]), catalog, quotes: new Map() });
  assert.deepEqual(lanes.axe.map(value => value.id), ["FIGSTONE_AXE", "HELIX_CHOPPER"]);
  assert.deepEqual(lanes.axe[0].knownChanges?.sweep, { current: 15, candidate: 25 });
  assert.ok(lanes.axe[0].semanticEvidence?.some(value => value.includes("1 step")));
  assert.ok(lanes.axe[1].semanticEvidence?.some(value => value.includes("2 steps")));
  assert.ok(lanes.axe[1].warnings.some(value => value.includes("not an inferred usage requirement")));
  assert.ok(!Object.values(lanes).flat().some(value => value.id === "UNRELATED_AXE"));
});

test("keeps Foraging armor upgrades slot-aware", () => {
  const catalog = [candidate("FIG_ARMOR_HELMET", { sweep: 10 }), candidate("HELIX_ARMOR_HELMET", { sweep: 20 }),
    candidate("HELIX_ARMOR_BOOTS", { sweep: 20 })];
  const lanes = buildForagingUpgradeLanes({ profile: profile([{ id: "FIG_ARMOR_HELMET", stats: { sweep: 10 } }]), catalog, quotes: new Map() });
  assert.deepEqual(lanes.helmet.map(value => value.id), ["HELIX_ARMOR_HELMET"]);
  assert.deepEqual(lanes.boots.map(value => value.id), ["HELIX_ARMOR_BOOTS"]);
  assert.deepEqual(lanes.helmet[0].knownChanges?.sweep, { current: 10, candidate: 20 });
  assert.deepEqual(lanes.boots[0].knownChanges?.sweep, { current: null, candidate: 20 });
});

test("keeps farther family members discoverable without inventing requirements", () => {
  const catalog = [candidate("SERIOUSLY_DAMAGED_AXE", { sweep: 10 }), candidate("FIG_AXE", { sweep: 15 }),
    candidate("FIGSTONE_AXE", { sweep: 25 }), candidate("HELIX_CHOPPER", { sweep: 50 })];
  const lanes = buildForagingUpgradeLanes({ profile: profile([]), catalog, quotes: new Map() });
  assert.deepEqual(lanes.axe.map(value => value.id), ["SERIOUSLY_DAMAGED_AXE", "FIG_AXE", "FIGSTONE_AXE", "HELIX_CHOPPER"]);
  assert.ok(lanes.axe[3].semanticEvidence?.some(value => value.includes("4 steps")));
  assert.deepEqual(lanes.axe[3].requirements, []);
});

test("keeps direct Foraging equipment progression slot-aware and excludes Safari Belt", () => {
  const catalog = [
    candidate("MANGROVE_LOCKET", { sweep: 1, foragingFortune: 5 }),
    candidate("HONEYCOMB_NECKLACE", { sweep: 5, foragingFortune: 25 }),
    candidate("MANGROVE_GRIPPERS", { sweep: 1, foragingFortune: 5 }),
    candidate("VEILSHROOM_BRACELET", { sweep: 5, foragingFortune: 25 }),
    candidate("MANGROVE_VINE", { sweep: 1, foragingFortune: 5 }),
    candidate("MOONGLADE_BELT", { foragingFortune: 5 }),
    candidate("TORRHUS_BELT", { foragingFortune: 10 }),
    candidate("SAFARI_BELT", { sweep: 50 }),
  ];
  const lanes = buildForagingUpgradeLanes({
    profile: profile([{ id: "MANGROVE_LOCKET", stats: { sweep: 1, foragingFortune: 5 } }]),
    catalog, quotes: new Map(),
  });
  assert.deepEqual(lanes.necklace.map(value => value.id), ["HONEYCOMB_NECKLACE"]);
  assert.deepEqual(lanes.bracelet.map(value => value.id), ["MANGROVE_GRIPPERS", "VEILSHROOM_BRACELET"]);
  assert.deepEqual(lanes.belt.map(value => value.id), ["MANGROVE_VINE", "MOONGLADE_BELT", "TORRHUS_BELT"]);
  assert.ok(!Object.values(lanes).flat().some(value => value.id === "SAFARI_BELT"));
});


test("uses an observed same-slot Safari Belt as the visible baseline while preserving Torrhus contest utility", () => {
  const catalog = [candidate("MANGROVE_VINE", { sweep: 1, foragingFortune: 5 }),
    candidate("MOONGLADE_BELT", { foragingFortune: 5 }), candidate("TORRHUS_BELT", { sweep: 2, foragingFortune: 10 })];
  const lanes = buildForagingUpgradeLanes({
    profile: profile([{ id: "SAFARI_BELT", categories: ["equipment", "belt"], stats: { sweep: 4, foragingFortune: 66 } }]),
    catalog, quotes: new Map(),
  });
  const torrhus = lanes.belt.find(value => value.id === "TORRHUS_BELT")!;
  assert.deepEqual(torrhus.knownChanges?.sweep, { current: 4, candidate: 2 });
  assert.deepEqual(torrhus.knownChanges?.foragingFortune, { current: 66, candidate: 10 });
  assert.ok(torrhus.semanticEvidence?.includes("Verified Starlyn Contest point bonus: +10%."));
});
