import "server-only";
import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { callLunaAdvisor } from "../src/server/advisor/luna";

const question = "What should I upgrade for mining?";

function selectedInput() {
  const usernameOrUuid = process.argv[2]?.trim();
  if (!usernameOrUuid) {
    throw new Error(
      "Provide a Minecraft username or UUID. Example: npm run validate:mining-luna -- ShinyFloa 500000000 Blueberry",
    );
  }

  const budgetArg = process.argv[3]?.trim();
  const budgetCoins = budgetArg === undefined ? undefined : Number(budgetArg);
  if (budgetArg !== undefined && (!Number.isFinite(budgetCoins) || budgetCoins! < 0)) {
    throw new Error("Optional budget must be a non-negative number of coins.");
  }

  const requestedProfile = process.argv[4]?.trim() || undefined;

  return { usernameOrUuid, requestedProfile, budgetCoins };
}

function outputSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function outputPathFor(username: string, requestedProfile?: string) {
  const profileSuffix = requestedProfile ? `-${outputSlug(requestedProfile)}` : "";
  return `docs/phase-5.2e-mining-luna-validation-${outputSlug(username)}${profileSuffix}.json`;
}

async function main() {
  const input = selectedInput();
  const outputPath = outputPathFor(input.usernameOrUuid, input.requestedProfile);
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
