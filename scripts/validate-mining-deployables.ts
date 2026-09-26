import "server-only";
import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { hypixelClient } from "../src/server/hypixel/client";
import { buildItemCatalog } from "../src/server/reference/item-catalog";
import { loadNeuRepository } from "../src/server/reference/neu/repository";
import { isMiningRelevantDeployable } from "../src/server/reference/deployable-mechanics";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const usernameOrUuid = process.argv[2]?.trim();
  const requestedProfile = process.argv[3]?.trim() || undefined;
  const rawBudget = process.argv[4]?.trim();
  const budgetCoins = rawBudget === undefined ? undefined : Number(rawBudget);
  if (!usernameOrUuid) throw new Error("Usage: npm run validate:mining-deployables -- <username-or-uuid> [profile] [budgetCoins]");
  if (rawBudget !== undefined && (!Number.isFinite(budgetCoins) || budgetCoins! < 0)) throw new Error("Budget must be a non-negative number.");

  const [built, items, neu] = await Promise.all([
    buildAdvisorContextInspectionForPlayer({ usernameOrUuid, requestedProfile, question: "What should I upgrade for mining?", budgetCoins }),
    hypixelClient.getItems(),
    loadNeuRepository(),
  ]);
  const catalog = buildItemCatalog(items, neu).getAll();
  const deployables = catalog.filter(item => item.deployableMechanics);
  const miningDeployables = deployables.filter(item => isMiningRelevantDeployable(item.deployableMechanics));
  const miningIds = new Set(miningDeployables.map(item => item.id));
  const frontier = built.frontierCandidates.filter(entry => miningIds.has(entry.candidate.item.id));

  const artifact = {
    generatedAt: new Date().toISOString(),
    player: { username: built.context.canonical.identity.username, profile: built.context.canonical.profile.cuteName, budgetCoins: budgetCoins ?? null },
    catalog: {
      detectedDeployables: deployables.length,
      miningRelevantDeployables: miningDeployables.length,
      deployables: deployables.map(item => ({
        id: item.id, name: item.name, categories: item.categories, rarity: item.rarity,
        deployableMechanics: item.deployableMechanics, requirements: item.requirements, lore: item.lore,
        miningRelevant: isMiningRelevantDeployable(item.deployableMechanics),
      })),
    },
    discovery: {
      miningCandidates: frontier.length,
      candidates: frontier.map(entry => ({
        id: entry.candidate.id, name: entry.candidate.item.name, price: entry.candidate.price?.coins ?? null,
        knownChanges: entry.candidate.knownChanges ?? {}, sourceLanes: entry.sourceLanes,
        bucket: entry.selection.bucket, selected: entry.selection.selected,
        exclusionReason: entry.selection.exclusionReason, selectionReason: entry.selection.reason,
        requirements: entry.candidate.item.requirements, warnings: entry.candidate.warnings,
      })),
    },
  };

  const output = `docs/phase-5.2i-mining-deployable-validation-${slug(built.context.canonical.identity.username)}-${slug(built.context.canonical.profile.cuteName)}.json`;
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output} (${deployables.length} deployables detected, ${miningDeployables.length} Mining-relevant, ${frontier.length} Mining candidates).`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Mining deployable validation failed."); process.exitCode = 1; });
