import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../src/server/reference/greenhouse-mutations.json";
import { mutationCatalogSummary, mutationLayout, mutationPrerequisites, mutationProgressionPaths,
  mutationSpawnWeight, mutationSpecialBehaviors } from "../src/server/farming/mutation-knowledge";
import { greenhouseMechanics } from "../src/server/farming/greenhouse-knowledge";

test("the complete mutation dependency graph resolves without cycles or missing names", () => {
  assert.equal(catalog.mutations.length, 40);
  assert.equal(new Set(catalog.mutations.map(mutation => mutation.name)).size, 40);
  for (const entry of catalog.mutations) {
    const path = mutationPrerequisites(entry.name);
    assert.equal(path?.path.at(-1), entry.name);
    assert.ok(path && new Set(path.path).size === path.path.length);
    assert.ok(entry.growthStages !== null && entry.growthStages >= 0);
    if (entry.condition === "ADJACENT") assert.equal(entry.specialRule, null);
    assert.ok(mutationSpawnWeight(entry.name));
    assert.equal(mutationSpawnWeight(entry.name)?.actualChance, null);
    assert.equal(mutationSpawnWeight(entry.name)?.weight === 0, ["Jerryflower", "Shellfruit"].includes(entry.name));
  }
  const shellfruit = mutationPrerequisites("Shellfruit");
  assert.ok(shellfruit?.path.includes("Turtlellini"));
  assert.ok(shellfruit?.path.includes("Blastberry"));
  assert.deepEqual(shellfruit?.specialSteps, ["Shellfruit"]);
  assert.ok(mutationPrerequisites("Timestalk")?.path.includes("Shellfruit"));
  assert.equal(mutationPrerequisites("Nonexistent"), null);
  assert.deepEqual(mutationCatalogSummary().analysisMilestones, [1, 10, 15, 20, 30, 40]);
  assert.equal(mutationCatalogSummary().verifiedLayoutCount, 36);
  assert.deepEqual(mutationCatalogSummary().countOnlyOrSpecial.sort(), ["Godseed", "Jerryflower", "Shellfruit", "Witherbloom"].sort());
  for (const mutation of catalog.mutations) {
    const layout = mutationLayout(mutation.name);
    if (!layout) continue;
    assert.equal(layout.cells.length, layout.width ** 2);
    const [width, height] = mutation.size.split("x").map(Number);
    assert.equal(layout.cells.filter(cell => cell === mutation.name).length, width * height);
    for (const requirement of mutation.requirements) {
      const name = requirement.name === "Melon" ? "Melon Slice" : requirement.name;
      assert.equal(layout.cells.filter(cell => cell === name).length, requirement.count, `${mutation.name}: ${name}`);
    }
  }
  assert.equal(mutationCatalogSummary().profileAnalysisStatus, "UNREPORTED");
  assert.equal(mutationCatalogSummary().spawnWeightCoverage, 40);
  assert.equal(mutationCatalogSummary().actualSpawnChanceStatus, "UNREPORTED");
  assert.equal(catalog.mutations.find(mutation => mutation.name === "Glasscorn")?.growthStages, 8);
});

test("mutation branches report only crop-level access and preserve unknown physical prerequisites", () => {
  assert.deepEqual(mutationProgressionPaths(null), []);
  assert.deepEqual(mutationProgressionPaths(6), []);
  const early = mutationProgressionPaths(9);
  assert.equal(early.length, 3);
  assert.equal(early.find(path => path.name === "Chocoberry")?.cropAccess, "LEVEL_ELIGIBLE");
  assert.equal(early.find(path => path.name === "Duskbloom")?.cropAccess, "FUTURE_LEVEL");
  const snoozling = mutationProgressionPaths(12).find(path => path.name === "Snoozling")!;
  assert.ok(snoozling.prerequisiteMutations.includes("Witherbloom"));
  assert.ok(snoozling.unknownInputs.includes("Dead Plant"));
  assert.equal(snoozling.cropAccess, "UNDETERMINED");
  const timestalk = mutationProgressionPaths(12, "Can I grow Timestalk?")[0];
  assert.ok(timestalk.specialSteps.includes("Shellfruit"));
  assert.equal(timestalk.profileDiscoveryStatus, "UNREPORTED");
  assert.equal(timestalk.spawnWeight, 20);
  assert.equal(mutationProgressionPaths(10, "What about Glasscorn?")[0].name, "Glasscorn");
  assert.equal(greenhouseMechanics().baseStageSeconds, 4 * 60 * 60);
  assert.equal(greenhouseMechanics().profileTimerStatus, "UNREPORTED");
  assert.equal(greenhouseMechanics().unlocks.vinesPerAdjacentCropSlot, 1);
  assert.equal(greenhouseMechanics().unlocks.additionalGreenhousesHaveAllSlots, true);
  assert.equal(greenhouseMechanics().vineDropChancePercentByMutationRarity.LEGENDARY, 40);
  assert.equal(mutationSpecialBehaviors().length, 10);
  assert.ok(mutationSpecialBehaviors().find(behavior => behavior.name === "Snoozling")?.rule.includes("5, 10 and 15"));
});
