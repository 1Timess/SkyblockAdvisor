import "server-only";
import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { callLunaAdvisor } from "../src/server/advisor/luna";

const question = "What should I upgrade for mining?";

const cohort = [
  { label: "EARLY", usernameOrUuid: "iTimess", requestedProfile: "Lemon", budgetCoins: 30_000_000 },
  { label: "MID", usernameOrUuid: "Mophh", requestedProfile: undefined, budgetCoins: undefined },
  { label: "LATE", usernameOrUuid: "ShinyFloa", requestedProfile: undefined, budgetCoins: 2_000_000_000 },
] as const;

function selectedCohort() {
  const requestedUsername = process.argv[2]?.trim();
  if (!requestedUsername) {
    throw new Error(
      "Provide exactly one validation username. Example: npm run validate:mining-luna -- ShinyFloa",
    );
  }

  const input = cohort.find(
    entry => entry.usernameOrUuid.toLowerCase() === requestedUsername.toLowerCase(),
  );
  if (!input) {
    throw new Error(
      `Unknown mining Luna validation username "${requestedUsername}". Expected one of: ${cohort.map(entry => entry.usernameOrUuid).join(", ")}.`,
    );
  }
  return input;
}

function outputPathFor(username: string) {
  return `docs/phase-5.2e-mining-luna-validation-${username.toLowerCase()}.json`;
}

async function main() {
  const input = selectedCohort();
  const outputPath = outputPathFor(input.usernameOrUuid);
  const built = await buildAdvisorContextInspectionForPlayer({
    usernameOrUuid: input.usernameOrUuid,
    requestedProfile: input.requestedProfile,
    question,
    budgetCoins: input.budgetCoins,
  });
  if (built.context.domainContext?.domain !== "MINING") {
    throw new Error(`Expected MINING context for ${input.usernameOrUuid}.`);
  }

  let report;
  try {
    const luna = await callLunaAdvisor(built.context);
    report = {
      cohort: input.label,
      player: {
        username: built.context.canonical.identity.username,
        profile: built.context.canonical.profile.cuteName,
        budgetCoins: input.budgetCoins ?? null,
      },
      route: built.route,
      deterministicContext: built.context,
      diagnostics: built.diagnostics,
      luna: { status: "SUCCESS" as const, advice: luna.advice, meta: luna.meta },
    };
  } catch (error) {
    report = {
      cohort: input.label,
      player: {
        username: built.context.canonical.identity.username,
        profile: built.context.canonical.profile.cuteName,
        budgetCoins: input.budgetCoins ?? null,
      },
      route: built.route,
      deterministicContext: built.context,
      diagnostics: built.diagnostics,
      luna: { status: "ERROR" as const, error: error instanceof Error ? error.message : "Unknown Luna error." },
    };
  }

  const successfulCalls = report.luna.status === "SUCCESS" ? 1 : 0;
  const estimatedCostUsd = report.luna.status === "SUCCESS" ? report.luna.meta.estimatedCostUsd : 0;
  const artifact = {
    generatedAt: new Date().toISOString(),
    question,
    requestedCalls: 1,
    successfulCalls,
    estimatedCostUsd,
    reports: [report],
  };
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath} (${successfulCalls}/1 Luna call succeeded).`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Mining Luna validation failed.");
  process.exitCode = 1;
});
