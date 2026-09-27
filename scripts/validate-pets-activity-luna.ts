import "server-only";
import { writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { callLunaAdvisor } from "../src/server/advisor/luna";

const defaultQuestion = "What should I upgrade for mining?";

function selectedInput() {
  const usernameOrUuid = process.argv[2]?.trim();
  const requestedProfile = process.argv[3]?.trim();
  const budgetArg = process.argv[4]?.trim();
  const question = process.argv[5]?.trim() || defaultQuestion;
  if (!usernameOrUuid || !requestedProfile) {
    throw new Error("Usage: npm run validate:pets-activity-luna -- <username> <profile> [budget] [question]");
  }
  const budgetCoins = budgetArg === undefined ? undefined : Number(budgetArg);
  if (budgetArg !== undefined && (!Number.isFinite(budgetCoins) || budgetCoins! < 0)) {
    throw new Error("Optional budget must be a non-negative number of coins.");
  }
  return { usernameOrUuid, requestedProfile, budgetCoins, question };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const input = selectedInput();
  const built = await buildAdvisorContextInspectionForPlayer({
    usernameOrUuid: input.usernameOrUuid,
    requestedProfile: input.requestedProfile,
    question: input.question,
    budgetCoins: input.budgetCoins,
  });
  if (built.context.domainContext?.domain !== "MINING" && built.context.domainContext?.domain !== "FISHING") {
    throw new Error(`Expected MINING or FISHING activity context, got ${built.context.domainContext?.domain ?? "NONE"}.`);
  }

  const petCandidates = built.context.candidates.filter(candidate => candidate.domain === "pet");
  let luna;
  try {
    const result = await callLunaAdvisor(built.context);
    luna = { status: "SUCCESS" as const, advice: result.advice, meta: result.meta };
  } catch (error) {
    luna = { status: "ERROR" as const, error: error instanceof Error ? error.message : "Unknown Luna error." };
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    question: input.question,
    player: {
      username: built.context.canonical.identity.username,
      profile: built.context.canonical.profile.cuteName,
      budgetCoins: input.budgetCoins ?? null,
    },
    route: built.route,
    petCandidateCount: petCandidates.length,
    petCandidates,
    deterministicContext: built.context,
    diagnostics: built.diagnostics,
    luna,
  };
  const outputPath = `docs/phase-5.3h-pets-luna-${slug(input.usernameOrUuid)}-${slug(input.requestedProfile)}.json`;
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath} (${luna.status}).`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Pets Luna validation failed.");
  process.exitCode = 1;
});
