import "server-only";
import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { advisorProfileSnapshotCache } from "../src/server/advisor/profile-intelligence";
import { hypixelClient } from "../src/server/hypixel/client";
import { buildItemCatalog } from "../src/server/reference/item-catalog";
import { loadNeuRepository } from "../src/server/reference/neu/repository";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const usernameOrUuid = process.argv[2]?.trim();
  const requestedProfile = process.argv[3]?.trim() || undefined;
  const rawBudget = process.argv[4]?.trim();
  const budgetCoins = rawBudget === undefined ? undefined : Number(rawBudget);
  if (!usernameOrUuid) throw new Error("Usage: npm run validate:mining-drill-components -- <username-or-uuid> [profile] [budgetCoins]");
  if (rawBudget !== undefined && (!Number.isFinite(budgetCoins) || budgetCoins! < 0)) throw new Error("Budget must be a non-negative number.");

  const question = "What should I upgrade for mining?";
  const [built, items, neu] = await Promise.all([
    buildAdvisorContextInspectionForPlayer({ usernameOrUuid, requestedProfile, question, budgetCoins }),
    hypixelClient.getItems(),
    loadNeuRepository(),
  ]);
  const snapshot = await advisorProfileSnapshotCache.getOrLoad({
    usernameOrUuid, requestedProfile, profileSnapshotId: built.diagnostics.snapshotId,
  });
  const catalog = buildItemCatalog(items, neu).getAll();
  const componentCategories = new Set(["drill_engine", "drill_fuel_tank", "drill_upgrade_module"]);
  const componentCatalog = catalog.filter(item => item.categories.some(category => componentCategories.has(category)));
  const componentFrontier = built.frontierCandidates.filter(entry => entry.candidate.mutation?.kind === "DRILL_COMPONENT");

  const artifact = {
    generatedAt: new Date().toISOString(),
    player: { username: built.context.canonical.identity.username, profile: built.context.canonical.profile.cuteName, budgetCoins: budgetCoins ?? null },
    drills: snapshot.snapshot.profile.inventoryItems.filter(item => item.drillComponents).map(item => ({
      id: item.id, uuid: item.uuid, name: item.name, source: item.source, stats: item.stats, drillComponents: item.drillComponents,
    })),
    catalog: {
      count: componentCatalog.length,
      components: componentCatalog.map(item => ({ id: item.id, name: item.name, categories: item.categories, stats: item.stats, drillComponentMechanics: item.drillComponentMechanics ?? null, lore: item.lore, requirements: item.requirements })),
    },
    discovery: {
      rawComponentMutations: componentFrontier.length,
      selectedComponentMutations: componentFrontier.filter(entry => entry.selection.selected).length,
      mutations: componentFrontier.map(entry => ({
        id: entry.candidate.id, name: entry.candidate.item.name, price: entry.candidate.price?.coins ?? null,
        knownChanges: entry.candidate.knownChanges ?? {}, mutation: entry.candidate.mutation,
        sourceLanes: entry.sourceLanes, bucket: entry.selection.bucket, selected: entry.selection.selected,
        exclusionReason: entry.selection.exclusionReason, selectionReason: entry.selection.reason,
        requirements: entry.candidate.item.requirements, warnings: entry.candidate.warnings,
      })),
    },
  };
  const output = `docs/phase-5.2eh-drill-component-validation-${slug(built.context.canonical.identity.username)}-${slug(built.context.canonical.profile.cuteName)}.json`;
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output} (${componentCatalog.length} catalog components, ${componentFrontier.length} component mutations).`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Drill component validation failed."); process.exitCode = 1; });
