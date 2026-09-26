import assert from "node:assert/strict";
import test from "node:test";
import { isMiningRelevantDeployable, parseDeployableMechanics } from "../src/server/reference/deployable-mechanics";
import { deployableStrictlyImproves } from "../src/server/candidates/deployables";
import type { CandidateItem } from "../src/schemas/catalog";

test("parses Glacite Lantern mechanics without relying on the Mining Deployable label", () => {
  const value = parseDeployableMechanics([
    "Ability: Deploy RIGHT CLICK",
    "Place an orb for 5m buffing up to 5 players within 30 blocks.",
    "Affects all players inside a Glacite Mineshaft, regardless of distance.",
    "Orb Buff: Glacite Lantern",
    "Grants +80 Mining Speed.",
    "Grants +20 Mining Fortune.",
    "Grants +10 Heat Resistance.",
    "Grants +5 Cold Resistance.",
    "Only one deployable buff applies.",
    "EPIC DEPLOYABLE",
  ]);
  assert.deepEqual(value, {
    durationSeconds: 300, radiusBlocks: 30, maxPlayers: 5, exclusiveBuff: true, mineshaftGlobal: true,
    effects: { miningSpeed: 80, miningFortune: 20, heatResistance: 10, coldResistance: 5 },
  });
  assert.equal(isMiningRelevantDeployable(value), true);
});

test("plain Deployable identity does not imply Mining relevance", () => {
  const value = parseDeployableMechanics([
    "Ability: Deploy RIGHT CLICK",
    "Place an orb for 60s buffing up to 5 players within 20 blocks.",
    "Grants +10 Vitality.",
    "Only one deployable buff applies.",
    "LEGENDARY DEPLOYABLE",
  ]);
  assert.ok(value);
  assert.equal(isMiningRelevantDeployable(value), false);
});

test("Mining relevance follows parsed effects rather than the footer label", () => {
  const value = parseDeployableMechanics([
    "Ability: Deploy RIGHT CLICK",
    "Place an orb for 5m.",
    "Grants +2.5 Gemstone Spread.",
    "LEGENDARY DEPLOYABLE",
  ]);
  assert.equal(value?.effects.gemstoneSpread, 2.5);
  assert.equal(isMiningRelevantDeployable(value), true);
});


test("references to deployables do not make an upgrade item a deployable", () => {
  const value = parseDeployableMechanics([
    "Combinable in Anvil",
    "Combine this Book in an Anvil with a deployable to gain a small but permanent stat boost!",
    "EPIC",
  ]);
  assert.equal(value, undefined);
});

test("parses self-only deployables and alternate exclusivity wording", () => {
  const value = parseDeployableMechanics([
    "Fishing Deployable",
    "Ability: Deploy RIGHT CLICK",
    "Place a totem down for 5m, buffing only yourself within 30 blocks.",
    "Deployable Buff: Corrupted",
    "Only one deployable can be active at a time.",
    "UNCOMMON DEPLOYABLE",
  ]);
  assert.ok(value);
  assert.equal(value.maxPlayers, 1);
  assert.equal(value.exclusiveBuff, true);
  assert.equal(value.durationSeconds, 300);
  assert.equal(value.radiusBlocks, 30);
});


test("production deployable comparison rejects Frankenstein sidegrades", () => {
  const make = (id: string, lore: string[]): CandidateItem => ({
    id, name: id, rarity: "rare", categories: ["deployable"], stats: {}, requirements: [],
    abilityText: [], setBonusText: [], source: "HYPIXEL", deployableMechanics: parseDeployableMechanics(lore),
  } as CandidateItem);
  const owned = make("OWNED", ["Ability: Deploy RIGHT CLICK", "Grants +60 Mining Speed.", "Grants +15 Mining Fortune.", "Grants +5 Heat Resistance.", "RARE DEPLOYABLE"]);
  const sidegrade = make("SIDEGRADE", ["Ability: Deploy RIGHT CLICK", "Grants +80 Mining Speed.", "Grants +10 Mining Fortune.", "EPIC DEPLOYABLE"]);
  const upgrade = make("UPGRADE", ["Ability: Deploy RIGHT CLICK", "Grants +80 Mining Speed.", "Grants +20 Mining Fortune.", "Grants +10 Heat Resistance.", "EPIC DEPLOYABLE"]);
  assert.equal(deployableStrictlyImproves(sidegrade, owned), false);
  assert.equal(deployableStrictlyImproves(upgrade, owned), true);
});
