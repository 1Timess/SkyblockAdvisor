// Diagnostic smoke test. No accounts created and no real passwords submitted.
// The test deliberately uses a nonexistent email at a reserved domain.
const EXPECTED_SECRET = "1x0000000000000000000000000000000AA";
const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

async function probe(base: URL, token?: string) {
  const response = await fetch(new URL("/api/auth/sign-in/email", base), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: base.origin,
      ...(token ? { "x-captcha-response": token } : {}),
    },
    body: JSON.stringify({
      email: "statixel-turnstile-smoke@invalid.example",
      password: "not-a-real-user-password",
    }),
    signal: AbortSignal.timeout(10000),
  });
  const payload: unknown = await response.json().catch(() => null);
  const code =
    payload && typeof payload === "object" && "code" in payload &&
    typeof payload.code === "string" ? payload.code : null;
  return { status: response.status, code };
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Only run against local development.");
  if (process.env.TURNSTILE_SECRET_KEY?.trim() !== EXPECTED_SECRET) {
    throw new Error("Requires Cloudflare's official always-pass test secret in .env.local.");
  }
  const configured = process.env.BETTER_AUTH_URL;
  if (!configured) throw new Error("BETTER_AUTH_URL is required.");
  const base = new URL(configured);
  if (base.hostname !== "localhost" && base.hostname !== "127.0.0.1") {
    throw new Error("Refusing to send test requests to a non-local host.");
  }

  const absent = await probe(base);
  const dummy = await probe(base, DUMMY_TOKEN);
  console.log("Missing challenge token:", absent);
  console.log("Official dummy token:", dummy);

  if (absent.status < 400 || dummy.status < 400) {
    throw new Error("Unexpected successful sign-in: investigate immediately.");
  }
  if (absent.status >= 500 || dummy.status >= 500) {
    throw new Error("Unexpected server error during authentication probes.");
  }
  if (absent.status === dummy.status && absent.code === dummy.code) {
    console.log("INCONCLUSIVE: both responses look identical. Inspect plugin behavior before treating challenge validation as proven.");
    return;
  }
  console.log("OBSERVED: rejected requests differ with a dummy challenge token. This does not establish production bot protection.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Turnstile probe failed.");
  process.exitCode = 1;
});
