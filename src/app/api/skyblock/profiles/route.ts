import { errorResponse, parseProfileQuery } from "@/server/api";
import { listProfiles } from "@/server/skyblock/profile/build-normalized-profile";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { usernameOrUuid } = parseProfileQuery(request);
    return Response.json(await listProfiles(usernameOrUuid), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
