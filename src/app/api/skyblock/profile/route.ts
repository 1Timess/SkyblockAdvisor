import { errorResponse, parseProfileQuery } from "@/server/api";
import { buildNormalizedProfile } from "@/server/skyblock/profile/build-normalized-profile";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return Response.json(await buildNormalizedProfile(parseProfileQuery(request)), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
