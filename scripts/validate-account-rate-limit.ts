// Local-only smoke test for Better Auth's PostgreSQL-backed sign-in throttle.
// Sends invalid credentials only. Run on an isolated local dev instance.
async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Do not run in production.");
  if (process.env.TURNSTILE_SECRET_KEY !== "1x0000000000000000000000000000000AA") {
    throw new Error("Requires Cloudflare's always-pass testing secret.");
  }
  const value = process.env.BETTER_AUTH_URL;
  if (!value) throw new Error("BETTER_AUTH_URL is not set.");
  const url = new URL(value);
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Only a localhost URL is allowed.");
  }

  const target = new URL("/api/auth/sign-in/email", url);
  const counts = new Map<number, number>();
  for (let i = 0; i < 12; i++) {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        Origin: url.origin,
        "Content-Type": "application/json",
        "x-captcha-response": "XXXX.DUMMY.TOKEN.XXXX",
      },
      body: JSON.stringify({
        email: "statixel-rate-limit-smoke@invalid.example",
        password: "deliberately-invalid-password",
      }),
      signal: AbortSignal.timeout(10000),
    });
    counts.set(response.status, (counts.get(response.status) ?? 0) + 1);
    if (response.status >= 500) throw new Error(`Server error HTTP ${response.status} on request ${i + 1}`);
  }

  console.log("Response statuses:", Object.fromEntries(counts));
  if (!counts.has(429)) {
    throw new Error("No HTTP 429 observed. Rate limiting is not yet verified.");
  }
  if ([200, 201, 204].some((status) => counts.has(status))) {
    throw new Error("Unexpected successful authentication.");
  }
  console.log("PASS: sign-in requests were throttled with HTTP 429.");
  console.log("NOTE: this does not validate concurrency, expiration, or proxy IP trust.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Rate limit test failed.");
  process.exitCode = 1;
});

export {};
