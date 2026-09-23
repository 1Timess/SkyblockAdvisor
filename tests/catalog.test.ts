import assert from "node:assert/strict";
import test from "node:test";
import { buildItemCatalog } from "../src/server/reference/item-catalog";
import { InMemoryNeuRepository } from "../src/server/reference/neu/repository";
import { checkItemRequirements, parseItemRequirements, parseRequirementText, romanToNumber } from "../src/server/reference/requirements";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureSources } from "./fixtures/profile";

const metadata = { provider: "neu" as const, repository: "fixture", branch: "main", etag: null, downloadedAt: "2026-01-01T00:00:00.000Z", itemCount: 2 };

test("catalog joins Hypixel identity with NEU lore without requiring total NEU coverage", () => {
  const neu = new InMemoryNeuRepository([{ internalname: "ARMOR", displayname: "§5Fixture Chestplate", lore: [
    "§7Health: §c+200", "§7Strength: §c+25", "", "§6Full Set Bonus: Fixture", "§7Retains raw mechanics.", "", "§4❣ §cRequires The Catacombs Floor V Completion.", "§5§lEPIC DUNGEON CHESTPLATE",
  ], infoType: "WIKI_URL", info: ["https://example.test/armor"] }], metadata);
  const catalog = buildItemCatalog([
    { id: "ARMOR", name: "Armor", category: "CHESTPLATE", tier: "EPIC" },
    { id: "NO_NEU", name: "No NEU", category: "SWORD", tier: "RARE" },
  ], neu);
  const armor = catalog.getById("ARMOR")!;
  assert.equal(armor.name, "Fixture Chestplate"); assert.deepEqual(armor.categories, ["armor", "chestplate"]);
  assert.deepEqual(armor.stats, { health: 200, strength: 25 }); assert.equal(armor.setBonusText[1], "Retains raw mechanics.");
  assert.deepEqual(armor.requirements.map(r => r.kind), ["DUNGEON_FLOOR"]); assert.equal(armor.wiki, "https://example.test/armor");
  assert.equal(catalog.getById("NO_NEU")?.sources.neu, false);
  assert.deepEqual(catalog.getDiagnostics(), { hypixelItems: 2, neuEnriched: 1, missingNeu: 1, neuParseFailures: 0 });
});

test("requirements parse only supplied high-confidence forms and preserve the rest", () => {
  assert.equal(romanToNumber("VII"), 7); assert.equal(romanToNumber("bad"), null);
  assert.deepEqual(parseRequirementText("§4❣ §cRequires Combat Skill 22."), { kind: "SKILL_LEVEL", skill: "combat", level: 22, sourceText: "Requires Combat Skill 22" });
  assert.deepEqual(parseRequirementText("Requires Wolf Slayer 6."), { kind: "SLAYER_LEVEL", slayer: "wolf", level: 6, sourceText: "Requires Wolf Slayer 6" });
  assert.deepEqual(parseRequirementText("Requires The Catacombs Floor VII Completion."), { kind: "DUNGEON_FLOOR", floor: 7, sourceText: "Requires The Catacombs Floor VII Completion" });
  assert.deepEqual(parseRequirementText("Requires Catacombs Skill 24."), { kind: "DUNGEON_LEVEL", level: 24, sourceText: "Requires Catacombs Skill 24" });
  assert.deepEqual(parseRequirementText("Requires Heart of the Mountain Tier 5."), { kind: "HEART_OF_THE_MOUNTAIN", tier: 5, sourceText: "Requires Heart of the Mountain Tier 5" });
  assert.deepEqual(parseRequirementText("Requires Garden Level 6."), { kind: "GARDEN_LEVEL", level: 6, sourceText: "Requires Garden Level 6" });
  assert.equal(parseRequirementText("Requires Novice Frog Collector."), null);
  const parsed = parseItemRequirements({ lore: ["Requires Enderman Slayer 6.", "Requires Novice Frog Collector."], slayerRequirement: "EMAN_6" });
  assert.equal(parsed.requirements.length, 1); assert.deepEqual(parsed.unparsedRequirementText, ["Requires Novice Frog Collector"]);
});

test("requirement checks use profile facts and leave deferred domains unknown", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const requirements = [
    parseRequirementText("Requires Combat Skill 2")!, parseRequirementText("Requires Wolf Slayer 1")!,
    parseRequirementText("Requires The Catacombs Floor VI Completion")!, parseRequirementText("Requires Heart of the Mountain Tier 2")!,
  ];
  const checks = checkItemRequirements({ requirements }, profile);
  assert.deepEqual(checks.map(check => check.status), ["MET", "UNKNOWN", "NOT_MET", "UNKNOWN"]);
  assert.deepEqual(checks.map(check => check.actual), [2, null, 5, null]);
});
