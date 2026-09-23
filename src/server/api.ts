import { AppError } from "./errors";
import { validatePlayerInput } from "./minecraft/resolve-player";

export function parseProfileQuery(request: Request) {
  const url = new URL(request.url);
  const usernameOrUuid = validatePlayerInput(url.searchParams.get("username") ?? "");
  const requestedProfile = url.searchParams.get("profile")?.trim() || undefined;
  if (requestedProfile && requestedProfile.length > 64) throw new AppError("INVALID_PROFILE", "Invalid profile selector.", 400);
  return { usernameOrUuid, requestedProfile };
}

export function errorResponse(error: unknown) {
  const known = error instanceof AppError;
  return Response.json({ error: { code: known ? error.code : "SERVER_ERROR", message: known ? error.message : "Unable to build the profile. Check the server configuration and try again." } },
    { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}
