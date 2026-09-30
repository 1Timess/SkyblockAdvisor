import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { buildAdvisorContextInspectionForPlayer } from "../src/server/advisor/build-live-context";
import { callLunaAdvisor } from "../src/server/advisor/luna";

const [usernameOrUuid, requestedProfile, questionArg] = process.argv.slice(2);
if (!usernameOrUuid || !requestedProfile) {
  throw new Error("Usage: npm run validate:farming-luna -- <username> <profile> [question]");
}
const question = questionArg?.trim() || "What Farming and Garden progression should I focus on next?";
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");

async function main() {
  const built = await buildAdvisorContextInspectionForPlayer({ usernameOrUuid, requestedProfile, question });
  if (built.route.domain !== "FARMING" || built.context.domainContext?.domain !== "FARMING")
    throw new Error(`Expected a FARMING route and context, got ${built.route.domain ?? "NONE"}. Luna was not called.`);
  if (!built.context.domainContext.gardenAvailable)
    throw new Error("Garden state is unavailable. Luna was not called.");
  if (built.context.candidates.length !== 0)
    throw new Error("Farming progression must not fabricate purchase candidates. Luna was not called.");

  let luna: { status: "SUCCESS"; advice: Awaited<ReturnType<typeof callLunaAdvisor>>["advice"]; meta: Awaited<ReturnType<typeof callLunaAdvisor>>["meta"] }
    | { status: "ERROR"; error: string };
  try {
    const result = await callLunaAdvisor(built.context); // Exactly one call per invocation.
    luna = { status: "SUCCESS", advice: result.advice, meta: result.meta };
  } catch (error) {
    luna = { status: "ERROR", error: error instanceof Error ? error.message : "Unknown Luna error." };
  }
  const output = `docs/farming-luna-${slug(usernameOrUuid)}-${slug(requestedProfile)}.json`;
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), question,
    player: { username: built.context.canonical.identity.username, profile: built.context.canonical.profile.cuteName },
    requestedCalls: 1, successfulCalls: luna.status === "SUCCESS" ? 1 : 0,
    estimatedCostUsd: luna.status === "SUCCESS" ? luna.meta.estimatedCostUsd : null,
    route: built.route, deterministicContext: built.context, diagnostics: built.diagnostics, luna,
  }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output} (${luna.status}; one Luna call attempted).`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
