import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryNeuRepository } from "../src/server/reference/neu/repository";
import { buildRunecraftingAdvisorContext } from "../src/server/runecrafting/advisor-context";
import { buildRuneCatalog, parseRuneReference } from "../src/server/runecrafting/reference";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureMember, fixtureSources } from "./fixtures/profile";

const metadata = { provider: "neu" as const, repository: "fixture", branch: "main", etag: null,
  downloadedAt: "2026-09-30T00:00:00.000Z", itemCount: 2 };

test("Runecrafting uses the dedicated 25-level XP curve", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_RUNECRAFTING = 0;
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildRunecraftingAdvisorContext(profile);
  assert.equal(context.domain, "RUNECRAFTING"); if (context.domain !== "RUNECRAFTING") throw new Error("unreachable");
  assert.equal(context.skill.nominalCap, 25);
  assert.equal(context.skill.xpTo25, 94300);
  assert.equal(context.accountMechanics.effectiveCap, null);
  assert.equal(context.accountMechanics.xpMultiplier, null);
  assert.equal(context.accountMechanics.defaultRankCap, 3);
  assert.equal(context.progressionFocus.actions[0]?.kind, "LEVEL_RUNECRAFTING");
});

test("Runecrafting holds at nominal cap", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_RUNECRAFTING = 94300;
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildRunecraftingAdvisorContext(profile);
  assert.equal(context.domain, "RUNECRAFTING"); if (context.domain !== "RUNECRAFTING") throw new Error("unreachable");
  assert.equal(context.skill.level, 25);
  assert.equal(context.skill.xpTo25, 0);
  assert.equal(context.progressionFocus.actions[0]?.kind, "HOLD");
});

test("NEU rune parsing keeps tier separate from Runecrafting requirement", () => {
  const parsed = parseRuneReference({ internalname: "TEST_RUNE;3", displayname: "§aTest Rune III",
    lore: ["§7Requires Runecrafting 15", "§7Apply this rune to a sword."] });
  assert.ok(parsed);
  assert.equal(parsed.tier, 3);
  assert.equal(parsed.runecraftingLevelRequired, 15);
  assert.equal(parsed.applicableTo, "sword");
});

test("NEU rune catalog preserves missing facts as null", () => {
  const repo = new InMemoryNeuRepository([
    { internalname: "TEST_RUNE;3", displayname: "Test Rune III", lore: ["Requires Runecrafting 15", "Apply this rune to a sword."] },
    { internalname: "MYSTERY_RUNE;1", displayname: "Mystery Rune I", lore: ["A cosmetic rune."] },
  ], metadata);
  const runes = buildRuneCatalog(repo);
  assert.equal(runes.length, 2);
  assert.equal(runes[1]?.tier, 1);
  assert.equal(runes[1]?.runecraftingLevelRequired, null);
  assert.equal(runes[1]?.applicableTo, null);
});


test("NEU rune parsing handles current Requires level lore layout", () => {
  const parsed = parseRuneReference({
    internalname: "AXE_FADING_BLUE_RUNE;1",
    displayname: "§9◆ Fading Blue Rune I",
    lore: [
      "§7Requires level 7",
      "§7Throwing Axe",
      "",
      "§7Your axe fades into beautiful blue",
      "§7particles!",
      "",
      "§7Apply this rune to throwing axe or",
      "§7fuse two together at the Runic",
      "§7Pedestal!",
      "",
      "§9RARE COSMETIC",
    ],
  });
  assert.ok(parsed);
  assert.equal(parsed.tier, 1);
  assert.equal(parsed.runecraftingLevelRequired, 7);
  assert.equal(parsed.applicableTo, "Throwing Axe");
});

test("NEU level-zero cosmetic rune requirements remain known", () => {
  const parsed = parseRuneReference({
    internalname: "ANTLERS_RUNE;3",
    displayname: "§6◆ Antlers Rune III",
    lore: ["§7Requires level 0", "§7Helmet", "", "§7Apply this rune to helmet or fuse", "§7two together at the Runic Pedestal!"],
  });
  assert.ok(parsed);
  assert.equal(parsed.runecraftingLevelRequired, 0);
  assert.equal(parsed.applicableTo, "Helmet");
});
