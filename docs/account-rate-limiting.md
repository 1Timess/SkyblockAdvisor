# Persistent authentication rate limits

The `rateLimit` PostgreSQL table is defined in Drizzle and its migration has been applied locally and committed. Better Auth now enables database storage in development and production, with a default limit of **60 requests per 60 seconds**.

Endpoint rules (all per Better Auth's request identity):
- Signup: 5 requests per hour, but signup remains disabled.
- Email/password sign-in: 10 per minute.
- Password reset request: 5 per hour.
- Verification email request: 5 per hour.

These values are starting thresholds, not validated production abuse protections. Requests that receive a 429 include the rate-limit retry header.

## Local smoke test

Pull the latest `main`, restart the Next.js development server and verify that `.env.local` has the official always-pass Cloudflare testing secret and `BETTER_AUTH_URL=http://localhost:3000`. Then run:

```powershell
node --env-file=.env.local --import tsx scripts/validate-account-rate-limit.ts
```

The test sends 12 invalid sign-in attempts to localhost and requires an HTTP 429. It uses no real account credentials and does not create users. Running it can temporarily throttle your own local login attempts.

If no 429 occurs, report the results rather than increasing request counts. It does not verify expiration, concurrency, email/account-specific throttles, proxy header trust or shared-IP fairness.

## Production security considerations

Better Auth's rate limiter uses network identity from request headers. Before deployment, configure a trusted reverse proxy and restrict direct access to the application; explicitly configure trusted proxy IP/header handling. A client-controlled `X-Forwarded-For` header must not be treated as authoritative.

PostgreSQL-backed throttling is a baseline, not protection against VPN rotation, residential proxies, coordinated signup farms, or unrestricted Vera spending. Public registration remains disabled.
