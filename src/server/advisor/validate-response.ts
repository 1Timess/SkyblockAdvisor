import { advisorResponseSchema, type AdvisorContext, type AdvisorResponse } from "../../schemas/advisor";

export function validateAdvisorResponse(value: unknown, context: AdvisorContext): AdvisorResponse {
  const response = advisorResponseSchema.parse(value), allowed = new Set(context.candidates.map(candidate => candidate.id));
  const familyMembers = new Map(context.candidates.filter(candidate => candidate.family).map(candidate => [candidate.id, new Set(candidate.family!.members.map(member => member.id))]));
  if (response.kind === "CLARIFICATION") return response;
  const ranks = response.actions.map(action => action.rank);
  if (new Set(ranks).size !== ranks.length || ranks.some((rank, index) => rank !== index + 1)) throw new Error("Advisor action ranks must be unique and contiguous from 1.");
  for (const action of response.actions) {
    if (action.candidateId !== null && !allowed.has(action.candidateId)) throw new Error(`Advisor returned unknown candidate ID: ${action.candidateId}`);
    if (action.actionType === "BUY" && action.candidateId === null) throw new Error("BUY actions require a supplied candidate ID.");
    if (action.memberCandidateIds.length) {
      if (action.candidateId === null || !familyMembers.has(action.candidateId)) throw new Error("Member candidate IDs require a supplied candidate family.");
      const members = familyMembers.get(action.candidateId)!;
      if (action.memberCandidateIds.some(id => !members.has(id))) throw new Error("Advisor returned an unknown candidate family member ID.");
    }
    if (action.actionType === "HOLD" && action.candidateId !== null) throw new Error("HOLD actions must not reference a candidate ID.");
  }
  return response;
}
