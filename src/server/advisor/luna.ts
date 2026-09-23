import "server-only";
import { z } from "zod";
import type { AdvisorContext, AdvisorResponse } from "../../schemas/advisor";
import { getAdvisorEnv } from "./env";
import { validateAdvisorResponse } from "./validate-response";

const model = "gpt-6-luna";
const apiResponseSchema = z.object({
  id: z.string(), model: z.string(), status: z.string(), output: z.array(z.object({
    type: z.string(), content: z.array(z.object({ type: z.string(), text: z.string().optional(), refusal: z.string().optional() }).passthrough()).optional(),
  }).passthrough()),
  usage: z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative(), total_tokens: z.number().int().nonnegative() }).optional(),
}).passthrough();

export interface LunaAdvisorResult {
  advice: AdvisorResponse;
  meta: { responseId: string; model: string; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
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
  if (!response.ok) throw new Error(`Luna request failed with status ${response.status}.`);
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
    outputTokens: usage?.output_tokens ?? null, totalTokens: usage?.total_tokens ?? null } };
}

const advisorInstructions = `You are Luna, a Hypixel SkyBlock progression advisor.
Use only facts in the supplied JSON context. Deterministic code has already built and filtered the candidates.
You own judgment, prioritization, sequencing, tradeoffs, and explanation. Return an ordered action plan.
When recommending a supplied item, copy its candidate ID exactly into candidateId. Never invent or alter a candidate ID.
Use candidateId null only for a prerequisite or non-item progression action.
Do not invent prices, stats, requirements, or mechanics. Treat warnings and missing values as uncertainty.
Raw ability and set-bonus text may inform judgment, but acknowledge ambiguity.
Do not claim mathematical optimality. If the shortlist is insufficient, explain what additional fact would change the advice.`;

const stringArray = { type: "array", items: { type: "string" } };
const advisorJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    actions: { type: "array", minItems: 1, maxItems: 5, items: {
      type: "object", additionalProperties: false,
      properties: {
        rank: { type: "integer", minimum: 1 }, candidateId: { anyOf: [{ type: "string" }, { type: "null" }] },
        action: { type: "string" }, why: { type: "string" }, tradeoffs: stringArray, prerequisites: stringArray,
        uncertainty: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      required: ["rank", "candidateId", "action", "why", "tradeoffs", "prerequisites", "uncertainty"],
    } },
    caveats: stringArray,
  },
  required: ["headline", "actions", "caveats"],
};
