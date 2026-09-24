import "server-only";
import { z } from "zod";
import type { AdvisorContext, AdvisorResponse } from "../../schemas/advisor";
import { getAdvisorEnv } from "./env";
import { validateAdvisorResponse } from "./validate-response";

const model = "gpt-6-luna";
const maxErrorBodyLength = 4_000;
// Standard text-token rates documented for GPT-6 Luna on 2026-09-23.
const pricingPerMillion = { input: 0.10, output: 0.50 } as const;
const apiResponseSchema = z.object({
  id: z.string(), model: z.string(), status: z.string(), output: z.array(z.object({
    type: z.string(), content: z.array(z.object({ type: z.string(), text: z.string().optional(), refusal: z.string().optional() }).passthrough()).optional(),
  }).passthrough()),
  usage: z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative(), total_tokens: z.number().int().nonnegative() }).optional(),
}).passthrough();

export interface LunaAdvisorResult {
  advice: AdvisorResponse;
  meta: { responseId: string; model: string; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; estimatedCostUsd: number | null };
}

export async function callLunaAdvisor(context: AdvisorContext, fetcher: typeof fetch = fetch, apiToken = getAdvisorEnv().OPENAI_API_TOKEN): Promise<LunaAdvisorResult> {
  const response = await fetcher("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: "medium" },
      max_output_tokens: 2500,
      instructions: advisorInstructions,
      input: JSON.stringify(context),
      text: { format: { type: "json_schema", name: "skyblock_advice", strict: true, schema: advisorJsonSchema } },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const rawBody = await response.text();
    const sanitizedBody = rawBody.split(apiToken).join("[REDACTED]").replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
    const body = sanitizedBody.length > maxErrorBodyLength ? `${sanitizedBody.slice(0, maxErrorBodyLength)}… [truncated]` : sanitizedBody;
    throw new Error(`Luna request failed with status ${response.status}: ${body || "<empty response body>"}`);
  }
  const parsed = apiResponseSchema.parse(await response.json());
  if (parsed.status !== "completed") throw new Error(`Luna response did not complete (status: ${parsed.status}).`);
  const refusal = parsed.output.flatMap(item => item.content ?? []).find(content => content.type === "refusal")?.refusal;
  if (refusal) throw new Error("Luna declined to produce an advisor response.");
  const outputText = parsed.output.flatMap(item => item.content ?? []).find(content => content.type === "output_text")?.text;
  if (!outputText) throw new Error("Luna response contained no structured output text.");
  let value: unknown;
  try { value = JSON.parse(outputText); } catch { throw new Error("Luna returned unreadable structured output."); }
  const advice = validateAdvisorResponse(value, context), usage = parsed.usage;
  return { advice, meta: { responseId: parsed.id, model: parsed.model, inputTokens: usage?.input_tokens ?? null,
    outputTokens: usage?.output_tokens ?? null, totalTokens: usage?.total_tokens ?? null,
    estimatedCostUsd: usage ? (usage.input_tokens * pricingPerMillion.input + usage.output_tokens * pricingPerMillion.output) / 1_000_000 : null } };
}

const advisorInstructions = `You are Luna, a Hypixel SkyBlock progression advisor.
Use only the supplied compact account context. Detailed candidates cover only the current route; other domains are summarized under availableAnalysis.
The user's explicit current goal takes priority over inferred build or class. If intent is materially ambiguous, return CLARIFICATION. Otherwise return PLAN. You own judgment, priority, sequence, tradeoffs, and explanation.
Deterministic code owns profile facts, prices, candidates, IDs, known changes, and requirements. Copy supplied candidate IDs exactly and never invent one.
Candidates are plausible possibilities, not guaranteed upgrades. Do not recommend an item merely because it is the best supplied candidate. Relevant candidates may be over budget or requirement-locked.
The supplied candidates are intentionally a representative progression frontier, not an exhaustive list. Absence from the shortlist does not imply an item is bad; it means it was not selected for this context window.
Use supplied budget and requirement gaps to judge whether saving or a prerequisite is worthwhile. You may sequence PROGRESSION followed by BUY. Do not invent how long an unlock will take.
BUY requires a supplied candidate ID. PROGRESSION and INVESTIGATE may use null. HOLD uses null and is valid when this domain does not justify spending.
You may offer another available domain through followUps, but do not claim detailed knowledge or recommend items from a domain whose candidates are not loaded.
Do not invent prices, stats, requirements, or mechanics. Treat warnings and missing values as uncertainty. Raw ability and set-bonus text may inform judgment, but acknowledge ambiguity.
Do not claim global mathematical optimality.`;

const stringArray = { type: "array", items: { type: "string" } };
const availableAnalysisJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    armor: domainAvailabilityJsonSchema(), weapons: domainAvailabilityJsonSchema(),
    accessories: { type: "object", additionalProperties: false, properties: {
      available: { type: "boolean" }, candidateCount: { type: "integer", minimum: 0 }, currentMagicalPower: { type: "number", minimum: 0 },
      missingCount: { type: "integer", minimum: 0 }, upgradeCount: { type: "integer", minimum: 0 },
    }, required: ["available", "candidateCount", "currentMagicalPower", "missingCount", "upgradeCount"] },
    pets: { type: "object", additionalProperties: false, properties: {
      available: { type: "boolean" }, candidateCount: { type: "integer", minimum: 0 }, ownedCount: { type: "integer", minimum: 0 },
    }, required: ["available", "candidateCount", "ownedCount"] },
  }, required: ["armor", "weapons", "accessories", "pets"],
};
const advisorJsonSchema = { anyOf: [
  { type: "object", additionalProperties: false, properties: {
    kind: { type: "string", const: "CLARIFICATION" }, question: { type: "string" },
    whyNeeded: { anyOf: [{ type: "string" }, { type: "null" }] }, suggestedAnswers: stringArray,
    availableAnalysis: availableAnalysisJsonSchema,
  }, required: ["kind", "question", "whyNeeded", "suggestedAnswers", "availableAnalysis"] },
  { type: "object", additionalProperties: false, properties: {
    kind: { type: "string", const: "PLAN" }, headline: { type: "string" },
    actions: { type: "array", minItems: 1, maxItems: 5, items: {
      type: "object", additionalProperties: false,
      properties: {
        rank: { type: "integer", minimum: 1 }, actionType: { type: "string", enum: ["BUY", "PROGRESSION", "HOLD", "INVESTIGATE"] },
        candidateId: { anyOf: [{ type: "string" }, { type: "null" }] }, action: { type: "string" }, why: { type: "string" },
        tradeoffs: stringArray, prerequisites: stringArray, uncertainty: { anyOf: [{ type: "string" }, { type: "null" }] },
      }, required: ["rank", "actionType", "candidateId", "action", "why", "tradeoffs", "prerequisites", "uncertainty"],
    } }, caveats: stringArray,
    followUps: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      domain: { type: "string", enum: ["ARMOR", "WEAPONS", "ACCESSORIES", "PETS"] }, label: { type: "string" }, reason: { type: "string" },
    }, required: ["domain", "label", "reason"] } },
  }, required: ["kind", "headline", "actions", "caveats", "followUps"] },
] };

function domainAvailabilityJsonSchema() {
  return { type: "object", additionalProperties: false, properties: {
    available: { type: "boolean" }, candidateCount: { type: "integer", minimum: 0 },
  }, required: ["available", "candidateCount"] };
}
