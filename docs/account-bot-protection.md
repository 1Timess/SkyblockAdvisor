# Account bot protection — staging configuration

Better Auth's CAPTCHA plugin is integrated with Cloudflare Turnstile. When `TURNSTILE_SECRET_KEY` is present, the middleware checks a Turnstile response on POST requests to `/sign-up/email`, `/sign-in/email`, and `/request-password-reset`. Better Auth reads the challenge token from the `x-captcha-response` request header and verifies it server-side with Cloudflare.

Cloudflare Turnstile tokens are short-lived and single-use. A new token is required for each protected request.

## Current restrictions

- **Public registration remains disabled.** There is no signup UI or widget yet.
- The CAPTCHA plugin is optional in local development until keys are configured. It must be required in production before registration can open.
- A CAPTCHA is not a substitute for durable registration/login throttling, account-risk scoring, or global Vera budget enforcement. Those remain unimplemented.
- Do not add the Turnstile secret to source control or a `NEXT_PUBLIC_` variable.

## Setup

1. Create a Cloudflare Turnstile widget for the development hostname (localhost) and obtain a site key and secret.
2. Add `TURNSTILE_SECRET_KEY` to `.env.local`. Keep `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for the future browser widget.
3. Restart the Next.js dev server so it loads the new environment.
4. Run the existing TypeScript, lint, and offline tests.
5. Check authenticated and unauthenticated endpoint behavior before enabling registration. Protected requests need the `x-captcha-response` header when Turnstile is configured.

Do not set a test key for production. We will validate error handling, replay behavior, shared-network false positives, and traffic limits separately.
