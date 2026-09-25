import "server-only";
import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { callLunaAdvisor } from "../src/server/advisor/luna";

const outputPath = "docs/phase-5.2e-mining-luna-validation.json";
const question = "What should I upgrade for mining?";

const cohort = [
  { label: "EARLY", usernameOrUuid: "iTimess", requestedProfile: "Lemon", budgetCoins: 30_000_000 },
  { label: "MID", usernameOrUuid: "Mophh", requestedProfile: undefined, budgetCoins: undefined },
  { label: "LATE", usernameOrUuid: "ShinyFloa", requestedProfile: undefined, budgetCoins: 2_000_000_000 },
] as const;

async function main() {
  const reports = [];
  for (const input of cohort) {
    const built = await buildAdvisorContextInspectionForPlayer({
      usernameOrUuid: input.usernameOrUuid,
      requestedProfile: input.requestedProfile,
      question,
      budgetCoins: input.budgetCoins,
    });
    if (built.context.domainContext?.domain !== "MINING") throw new Error(`Expected MINING context for ${input.usernameOrUuid}.`);

    try {
      const luna = await callLunaAdvisor(built.context);
      reports.push({
        cohort: input.label,
        player: {
          username: built.context.canonical.identity.username,
          profile: built.context.canonical.profile.cuteName,
          budgetCoins: input.budgetCoins ?? null,
        },
        route: built.route,
        deterministicContext: built.context,
        diagnostics: built.diagnostics,
        luna: { status: "SUCCESS", advice: luna.advice, meta: luna.meta },
      });
    } catch (error) {
      reports.push({
        cohort: input.label,
        player: {
          username: built.context.canonical.identity.username,
          profile: built.context.canonical.profile.cuteName,
          budgetCoins: input.budgetCoins ?? null,
        },
        route: built.route,
        deterministicContext: built.context,
        diagnostics: built.diagnostics,
        luna: { status: "ERROR", error: error instanceof Error ? error.message : "Unknown Luna error." },
      });
    }
  }

  const successfulCalls = reports.filter(report => report.luna.status === "SUCCESS").length;
  const estimatedCostUsd = reports.reduce((sum, report) =>
    sum + (report.luna.status === "SUCCESS" ? report.luna.meta.estimatedCostUsd ?? 0 : 0), 0);
  const artifact = {
    generatedAt: new Date().toISOString(),
    question,
    requestedCalls: cohort.length,
    successfulCalls,
    estimatedCostUsd,
    reports,
  };
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath} (${successfulCalls}/${cohort.length} Luna calls succeeded).`);
}

main().catch(async error => {
  const artifact = {
    generatedAt: new Date().toISOString(),
    question,
    requestedCalls: cohort.length,
    successfulCalls: 0,
    fatalError: error instanceof Error ? error.message : "Mining Luna validation failed.",
  };
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.error(`Mining Luna validation failed. Details were written to ${outputPath}.`);
  process.exitCode = 1;
});
