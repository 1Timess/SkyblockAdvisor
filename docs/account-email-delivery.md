# Resend transactional account email

Statixel uses Resend's HTTPS API for email verification and password recovery. Both callbacks are configured in Better Auth, but **public registration remains disabled** and no user-facing registration flow is enabled.

## Development setup

Create a Resend account and an API key with only the sending permission. Put `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in your untracked `.env.local`. Never commit or paste the key. For testing, use a sender address Resend permits for your account, such as its documented test sender `onboarding@resend.dev`. Test sender restrictions apply: it is not a public-registration solution.

The email module requires both values explicitly and reports delivery failures without logging authentication links or provider response bodies. It contains no user-facing email test endpoint.

## Production gate

Before turning off `emailAndPassword.disableSignUp`, verify a sending domain with Resend, validate actual email delivery and reset flows, configure bot challenges and registration throttling, test resend and account-enumeration behavior, and confirm the global Vera usage controls.

Do not confuse callback configuration with successful end-to-end delivery. Keep registration disabled until these checks pass.
