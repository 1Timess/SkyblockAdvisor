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
  usage: z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative(), total_tokens: z.number().int().nonnegative() }).passthrough().optional(),
  incomplete_details: z.object({ reason: z.string().optional() }).passthrough().nullable().optional(),
}).passthrough();

function incompleteResponseError(parsed: z.infer<typeof apiResponseSchema>) {
  const reason = parsed.incomplete_details?.reason ?? "unknown";
  const usage = parsed.usage;
  const usageSummary = usage
    ? `input_tokens=${usage.input_tokens}, output_tokens=${usage.output_tokens}, total_tokens=${usage.total_tokens}`
    : "usage unavailable";
  return new Error(
    `Luna response did not complete (status: ${parsed.status}, reason: ${reason}; ${usageSummary}; response_id=${parsed.id}, model=${parsed.model}).`,
  );
}

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
      max_output_tokens: 5000,
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
  if (parsed.status !== "completed") throw incompleteResponseError(parsed);
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
Deterministic code owns profile facts, prices, candidates, IDs, known changes, and requirements. Copy supplied candidate IDs exactly and never invent, reconstruct, normalize, or guess one. Candidate IDs may contain opaque UUIDs: treat the entire ID as an indivisible string copied verbatim from one supplied top-level candidate. Never derive an ID from a similar candidate or family member.
Candidates are plausible possibilities, not guaranteed upgrades. Do not recommend an item merely because it is the best supplied candidate. Relevant candidates may be over budget or requirement-locked.
Pet-domain candidates inside the current route are real detailed candidates even if availableAnalysis.pets is summary-only or normalized profile warnings say some pet data is unavailable. If current-route candidates with domain \"pet\" are supplied, assess them from their supplied relevance, known changes, ability text, requirements, warnings, and family metadata. Never claim pet effects or pet upgrades are unavailable when such pet candidates are present; instead state the specific missing field (for example price or exact effect magnitude) as uncertainty.
The supplied candidates are intentionally a representative progression frontier, not an exhaustive list. Absence from the shortlist does not imply an item is bad; it means it was not selected for this context window.
For ENCHANTING, use domainContext.xpActivity for an XP progression action when appropriate. matchedRewards are possible drops named in the question, not owned items or BUY candidates. lowerEnchantedItems is a capped sample; lowerEnchantedItemCount counts distinct visible names, including inactive inventory. A lower enchant on visible gear supports investigation of an upgrade, but does not prove compatibility, value, active use, or acquisition. Never imply RNG Meter progress or charge availability.
For COLLECTIONS, use the sourced nextTier amount, remaining count, unlock strings, and explicitly observed minionFocus tiers. unlockedTier is explicit API tier evidence; countTier is an estimate from this member's collected amount. Do not equate countTier or minionRecipeFocus COUNT_THRESHOLD with a claimed unlock. minionRecipeFocus joins collection unlock names to canonical generator IDs, while minionUpgradeFocus shows the next catalogued tier for observed crafted families, including minions with no collection unlock. These are separate samples, not a cost or value ranking. NOT_OBSERVED means no matching craft tier in profile data, not proof it was never crafted. A nextCraftTier does not prove the player owns the prerequisite minion or ingredients. Do not claim placed minions, production rates, recipe ingredients, upgrade costs, or minion slot unlocks. Recommend progression or investigation with null candidateId; no collection item BUY candidate is supplied.
For SLAYER, distinguish observed XP and kill history, literal claimedRewardKeys, level unlocks, separate item use requirements, and boss drop eligibility conditions. levelReached says whether the observed XP level meets the displayed unlock level; a reached level is not a new progression target. A drop condition gives the boss tier and Slayer level for a possible drop; it does not prove fight access, combat viability, ownership, active quest, RNG meter progress, or drop probability. craftedSlayerMinions records observed crafted tiers, not placed minions or available ingredients. An unlockFocus itemId is a catalog reference, not a BUY candidate; use null candidateId for progression or investigation. Never assume an absent claim key means the reward is unclaimed, or that a level unlock grants an item automatically. Do not rank bosses by profit, speed, or cost without corresponding evidence. If XP is null, say unreported rather than zero. Possible RNG options are a catalog, not player meter state.
Use supplied budget and requirement gaps to judge whether saving or a prerequisite is worthwhile. You may sequence PROGRESSION followed by BUY. Do not invent how long an unlock will take.
BUY requires a supplied candidate ID. PROGRESSION and INVESTIGATE may use null. HOLD uses null and is valid when this domain does not justify spending.
Some candidates contain a family with concrete members. The top-level candidate ID is the canonical ID for that family and remains the required candidateId for BUY. For an ordinary grouped family, the members are independently actionable pieces: explain the individual member upgrades and return the exact member IDs you recommend in memberCandidateIds. Do not hide the per-item breakdown behind only an aggregate. Family totals summarize the supplied members.
Some candidates instead contain petAcquisitionFamily. Its members are alternative concrete rarity choices for the same pet type, not a bundle to buy together. If recommending a pet acquisition family, choose only the concrete rarity member or members that make sense as alternatives, explain the distinction, and put only those exact member IDs in memberCandidateIds. Never imply the user should acquire every rarity. Missing pet prices remain uncertainty; do not invent which rarity is best value when the supplied context cannot establish that.
For every BUY action, copy exactly one top-level supplied candidate id into candidateId. Never put a family member ID in candidateId and never set candidateId to null for a family BUY. memberCandidateIds is supplemental detail only: use [] for ordinary candidates, and only supplied member IDs for grouped families or pet acquisition families.
You may offer another available domain through followUps, but do not claim detailed knowledge or recommend items from a domain whose candidates are not loaded.
Do not invent prices, stats, requirements, or mechanics. Treat warnings and missing values as uncertainty. Raw ability and set-bonus text may inform judgment, but acknowledge ambiguity.
The response schema contains fields for both outcome kinds. For CLARIFICATION, set headline to null and plan arrays to empty. For PLAN, set question, whyNeeded, and availableAnalysis to null and suggestedAnswers to empty.
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
    dungeons: domainAvailabilityJsonSchema(), fishing: domainAvailabilityJsonSchema(), mining: domainAvailabilityJsonSchema(), enchanting: domainAvailabilityJsonSchema(), collections: domainAvailabilityJsonSchema(), slayer: domainAvailabilityJsonSchema(),
  }, required: ["armor", "weapons", "accessories", "pets", "dungeons", "fishing", "mining", "enchanting", "collections", "slayer"],
};
const advisorJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["CLARIFICATION", "PLAN"] },
    question: { anyOf: [{ type: "string" }, { type: "null" }] },
    whyNeeded: { anyOf: [{ type: "string" }, { type: "null" }] },
    suggestedAnswers: stringArray,
    availableAnalysis: { anyOf: [availableAnalysisJsonSchema, { type: "null" }] },
    headline: { anyOf: [{ type: "string" }, { type: "null" }] },
    actions: { type: "array", maxItems: 5, items: {
      type: "object", additionalProperties: false,
      properties: {
        rank: { type: "integer", minimum: 1 }, actionType: { type: "string", enum: ["BUY", "PROGRESSION", "HOLD", "INVESTIGATE"] },
        candidateId: { anyOf: [{ type: "string" }, { type: "null" }] }, memberCandidateIds: stringArray, action: { type: "string" }, why: { type: "string" },
        tradeoffs: stringArray, prerequisites: stringArray, uncertainty: { anyOf: [{ type: "string" }, { type: "null" }] },
      }, required: ["rank", "actionType", "candidateId", "memberCandidateIds", "action", "why", "tradeoffs", "prerequisites", "uncertainty"],
    } },
    caveats: stringArray,
    followUps: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      domain: { type: "string", enum: ["ARMOR", "WEAPONS", "ACCESSORIES", "PETS", "FISHING", "MINING", "ENCHANTING", "COLLECTIONS", "SLAYER", "DUNGEONS"] }, label: { type: "string" }, reason: { type: "string" },
    }, required: ["domain", "label", "reason"] } },
  },
  required: ["kind", "question", "whyNeeded", "suggestedAnswers", "availableAnalysis", "headline", "actions", "caveats", "followUps"],
};

function domainAvailabilityJsonSchema() {
  return { type: "object", additionalProperties: false, properties: {
    available: { type: "boolean" }, candidateCount: { type: "integer", minimum: 0 },
  }, required: ["available", "candidateCount"] };
}
