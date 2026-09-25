import { writeFile } from "node:fs/promises";
import type { AdvisorConversationState } from "../src/schemas/advisor";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { advisorProfileSnapshotCache } from "../src/server/advisor/profile-intelligence";

async function main() {
  const usernameOrUuid = process.env.INSPECT_USERNAME?.trim() || "iTimess", requestedProfile = process.env.INSPECT_PROFILE?.trim() || undefined;
  const loaded = await advisorProfileSnapshotCache.getOrLoad({ usernameOrUuid, requestedProfile });
  const profile = loaded.snapshot.profile;
  let state: AdvisorConversationState = { profileSnapshotId: loaded.snapshot.snapshotId, budgetCoins: 30_000_000 };
  const queries = ["What should I upgrade for mining?", "I'm looking for fishing gear. What's the best upgrade available to me?", "Okay, what about my MP then?"];
  const contexts = [];
  for (const question of queries) {
    const result = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid, requestedProfile, question, conversationState: state });
    state = result.nextConversationState;
    contexts.push({ question, domain: result.route.domain, cacheReused: result.diagnostics.cacheReused,
      domainPayload: result.context.domainContext?.domain ?? null, candidateCount: result.context.candidates.length });
  }
  const mining = profile.progression.mining, foraging = profile.progression.foraging, fishing = profile.progression.fishing;
  const artifact = { generatedAt: new Date().toISOString(), lunaCalls: 0, normalizedProfileFetchesInProcess: 1,
    snapshotId: loaded.snapshot.snapshotId,
    mining: { skillLevel: profile.progression.skills.mining?.level ?? null, treeExperience: mining.treeExperience, hotmLevel: mining.hotmLevel,
      powder: mining.powder, selectedAbility: mining.selectedAbility, selectedAbilities: mining.selectedAbilities,
      selectedTreeSlot: mining.selectedTreeSlot, selectedTreeSlots: mining.selectedTreeSlots, tokensSpent: mining.tokensSpent,
      tokensSpentByTree: mining.tokensSpentByTree, miningKnowledge: loaded.snapshot.domains.MINING.domain === "MINING" ? loaded.snapshot.domains.MINING.miningKnowledge : null,
      crystalHollows: mining.crystalHollows, glaciteTunnels: mining.glaciteTunnels,
      sampleNodes: Object.fromEntries(Object.entries(mining.nodes).slice(0, 8)) },
    foraging: { skillLevel: profile.progression.skills.foraging?.level ?? null, treeExperience: foraging.treeExperience,
      sweepLevel: foraging.sweepLevel, foragingFortuneNodeLevel: foraging.foragingFortuneNodeLevel },
    accessories: { magicalPower: profile.accessories.magicalPower.total, highestMagicalPower: profile.accessories.highestMagicalPower,
      selectedPower: profile.accessories.selectedPower, unlockedPowers: profile.accessories.unlockedPowers,
      bagUpgradesPurchased: profile.accessories.bagUpgradesPurchased, tuning: profile.accessories.tuning },
    fishing: { skillLevel: profile.progression.skills.fishing?.level ?? null, itemsFished: fishing.itemsFished,
      seaCreatureKills: fishing.seaCreatureKills, trophyFishCounters: Object.keys(fishing.trophyFish).length,
      trophyFishTotalCaught: fishing.trophyFish.total_caught ?? null }, contexts };
  if (process.env.WRITE_VALIDATION_ARTIFACT === "1") await writeFile("docs/phase-5.1-live-validation.json", `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(artifact, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Phase 5.1 inspection failed."); process.exitCode = 1; });
