import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { callLunaAdvisor } from "../src/server/advisor/luna";

function inputFromArgs() {
  const [usernameOrUuid, requestedProfile, rawBudget, question, expectedReward] = process.argv.slice(2);
  if (!usernameOrUuid || !requestedProfile || !rawBudget || !question?.trim())
    throw new Error("Usage: npm run validate:enchanting-luna -- <username> <profile> <budget> <question> [expected-reward]");
  const budgetCoins = Number(rawBudget);
  if (!Number.isFinite(budgetCoins) || budgetCoins < 0) throw new Error("Budget must be a non-negative number of coins.");
  return { usernameOrUuid, requestedProfile, budgetCoins, question: question.trim(), expectedReward: expectedReward?.trim() || null };
}

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, ""); }

async function main() {
  const input = inputFromArgs();
  const built = await buildAdvisorContextInspectionForPlayer(input);
  const domain = built.context.domainContext;
  if (built.route.domain !== "ENCHANTING" || domain?.domain !== "ENCHANTING")
    throw new Error(`Expected an ENCHANTING route and context, got ${built.route.domain ?? "NONE"}.`);
  if (built.context.candidates.length !== 0) throw new Error("Enchanting reward focus must not fabricate BUY candidates.");
  if (input.expectedReward && !domain.matchedRewards.some(reward => reward.name.toLowerCase() === input.expectedReward!.toLowerCase()))
    throw new Error(`Named reward ${input.expectedReward} was not selected by deterministic matching; Luna was not called.`);

  const outputPath = `docs/phase-5.4c-enchanting-luna-${slug(input.usernameOrUuid)}-${slug(input.requestedProfile)}.json`;
  let luna: { status: "SUCCESS"; advice: Awaited<ReturnType<typeof callLunaAdvisor>>["advice"]; meta: Awaited<ReturnType<typeof callLunaAdvisor>>["meta"] }
    | { status: "ERROR"; error: string };
  try {
    const result = await callLunaAdvisor(built.context); // Exactly one call per invocation.
    luna = { status: "SUCCESS", advice: result.advice, meta: result.meta };
  } catch (error) {
    luna = { status: "ERROR", error: error instanceof Error ? error.message : "Unknown Luna error." };
  }
  const artifact = {
    generatedAt: new Date().toISOString(), input,
    requestedCalls: 1, successfulCalls: luna.status === "SUCCESS" ? 1 : 0,
    estimatedCostUsd: luna.status === "SUCCESS" ? luna.meta.estimatedCostUsd : null,
    deterministicContext: built.context, diagnostics: built.diagnostics, luna,
  };
  await mkdir("docs", { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath} (${luna.status}; one Luna call attempted).`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Enchanting Luna validation failed."); process.exitCode = 1; });
