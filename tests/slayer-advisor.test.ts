import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { InMemoryNeuRepository } from "../src/server/reference/neu/repository";
import { buildSlayerAdvisorContext } from "../src/server/slayer/advisor-context";
import { routeAdvisorQuestion } from "../src/server/advisor/routing";
import { buildAdvisorContext } from "../src/server/advisor/context";
import { advisorDomainContextSchema } from "../src/schemas/advisor";
import { fixtureSources } from "./fixtures/profile";
import levels from "../src/server/reference/slayer-level-rewards.json";
import drops from "../src/server/reference/slayer-boss-drops.json";
import { slayerThresholds } from "../src/server/skyblock/domains/slayers";

test("sourced Slayer levels agree with XP thresholds and boss conditions stay bounded", () => {
  assert.equal(Object.values(levels.families).reduce((sum, family) => sum + Object.values(family.levels).reduce((n, row) => n + row.unlocks.length, 0), 0), 148);
  assert.equal(Object.values(drops.families).reduce((sum, family) => sum + family.drops.length, 0), 102);
  for (const [id, family] of Object.entries(levels.families)) {
    for (const [level, reward] of Object.entries(family.levels))
      assert.equal(reward.xp, slayerThresholds[id][Number(level) - 1], `${id} level ${level}`);
  }
  for (const [id, family] of Object.entries(drops.families)) {
    for (const drop of family.drops) for (const condition of drop.conditions) {
      assert.ok(condition.bossTier >= 1 && condition.bossTier <= (id === "zombie" || id === "spider" || id === "vampire" ? 5 : 4));
      assert.ok(condition.slayerLevel >= 0 && condition.slayerLevel <= slayerThresholds[id].length);
    }
  }
});

test("Slayer level unlocks, use gates and boss drop conditions remain separate", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.progression.slayers.zombie.xp = 20000;
  profile.progression.slayers.zombie.level = 6;
  profile.progression.slayers.zombie.xpReported = true;
  profile.progression.slayers.zombie.claimedRewardKeys = ["level_7_special", "level_8_special"];
  const neu = new InMemoryNeuRepository([
    { internalname: "REAPER_MASK", displayname: "§6Reaper Mask", slayer_req: "ZOMBIE_7" },
    { internalname: "WARDEN_HEART", displayname: "§5Warden Heart" },
  ], { provider: "neu", repository: "fixture", branch: "test", etag: null, downloadedAt: new Date().toISOString(), itemCount: 2 });
  const context = buildSlayerAdvisorContext(profile, "What does Zombie Slayer 7 unlock and where does Warden Heart drop?", neu);
  assert.equal(context.domain, "SLAYER");
  if (context.domain !== "SLAYER") return;
  assert.equal(context.families.find(family => family.id === "zombie")!.xpToNext, 80000);
  assert.deepEqual(context.families.find(family => family.id === "zombie")!.claimedRewardKeys, ["level_7_special", "level_8_special"]);
  assert.deepEqual(context.dropFocus.find(drop => drop.neuId === "WARDEN_HEART")!.conditions,
    [{ bossTier: 5, slayerLevel: 7 }]);
  assert.ok(context.unlockFocus.every(unlock => unlock.level === 7));
  assert.deepEqual(context.unlockFocus.find(unlock => unlock.name === "Reaper Mask"),
    { family: "zombie", level: 7, levelReached: false, name: "Reaper Mask", itemId: "REAPER_MASK", useRequirementLevel: 7 });
  assert.equal(context.possibleRngOptionCount, 92);
  advisorDomainContextSchema.parse(context);
});

test("Slayer routing is explicit and survives a follow-up", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  const route = routeAdvisorQuestion({ question: "What should I do for Wolf Slayer?", profile });
  assert.equal(route.domain, "SLAYER");
  assert.equal(route.scope, "SLAYER");
  assert.equal(route.goal, "SLAYER");
  assert.equal(routeAdvisorQuestion({ question: "What about the next level?", profile,
    conversationState: { currentDomain: "SLAYER", goal: "SLAYER" } }).domain, "SLAYER");
  assert.equal(routeAdvisorQuestion({ question: "What about Overflux Capacitor?", profile }).domain, "SLAYER");
});

test("Slayer advisor payload keeps unreported XP null and contains no purchase candidates", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  profile.progression.slayers.zombie.xpReported = false;
  const neu = new InMemoryNeuRepository([], { provider: "neu", repository: "fixture", branch: "test", etag: null,
    downloadedAt: new Date().toISOString(), itemCount: 0 });
  const question = "What Slayer progression should I focus on next?";
  const context = buildAdvisorContext({ question, profile, route: routeAdvisorQuestion({ question, profile }),
    availableAnalysis: { armor: { available: false, candidateCount: 0 }, weapons: { available: false, candidateCount: 0 },
      accessories: { available: false, candidateCount: 0, currentMagicalPower: 0, missingCount: 0, upgradeCount: 0 },
      pets: { available: false, candidateCount: 0, ownedCount: 0 }, dungeons: { available: false, candidateCount: 0 },
      fishing: { available: false, candidateCount: 0 }, mining: { available: false, candidateCount: 0 },
      enchanting: { available: false, candidateCount: 0 }, collections: { available: false, candidateCount: 0 },
      slayer: { available: true, candidateCount: 0 } },
    candidates: [], domainContext: buildSlayerAdvisorContext(profile, question, neu) });
  assert.equal(context.canonical.slayers.zombie.xp, null);
  assert.equal(context.candidates.length, 0);
  assert.equal(context.domainContext?.domain, "SLAYER");
  assert.ok(Buffer.byteLength(JSON.stringify(context)) < 12000);
});
