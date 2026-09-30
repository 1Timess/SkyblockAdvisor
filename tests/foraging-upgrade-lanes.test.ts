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
function profile(items: Array<{ id: string; stats: Record<string, number> }>) {
  return { inventoryItems: items.map(item => ({ id: item.id, stats: item.stats })) } as unknown as NormalizedSkyBlockProfile;
}

test("discovers only later supported axe-family upgrades", () => {
  const catalog = [candidate("SERIOUSLY_DAMAGED_AXE", { sweep: 10 }), candidate("FIG_HEW", { sweep: 15 }),
    candidate("FIGSTONE_SPLITTER", { sweep: 25 }), candidate("HELIX_CHOPPER", { sweep: 50 }), candidate("UNRELATED_AXE", { sweep: 999 })];
  const lanes = buildForagingUpgradeLanes({ profile: profile([{ id: "FIG_HEW", stats: { sweep: 15 } }]), catalog, quotes: new Map() });
  assert.deepEqual(lanes.axe.map(value => value.id), ["FIGSTONE_SPLITTER", "HELIX_CHOPPER"]);
  assert.deepEqual(lanes.axe[0].knownChanges?.sweep, { current: 15, candidate: 25 });
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
