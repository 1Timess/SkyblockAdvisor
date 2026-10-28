# Resend transactional account email

Statixel uses Resend's HTTPS API for email verification and password recovery. Both callbacks are configured in Better Auth, but **public registration remains disabled** and no user-facing registration flow is enabled.

## Development setup

Create a Resend API key with sending permissions and place `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in the untracked `.env.local`. Do not commit or paste the key.

Without a verified sending domain, Resend's documented test sender `onboarding@resend.dev` is restricted to approved testing recipients. It is not suitable for public account registration.

## One-message delivery smoke test

Set `RESEND_TEST_TO` in your untracked `.env.local` to an inbox that Resend permits you to send to. Then run:

```powershell
node --conditions=react-server --env-file=.env.local --import tsx scripts/validate-account-email.ts
```

This makes **one actual email API request**. It includes no links, passwords, tokens or secrets in the message. A successful API response proves the provider accepted the request, **not** that the message arrived in the inbox. Verify receipt independently. The script sends only to the explicitly configured test recipient and does not create any account or modify PostgreSQL.

Never publish the API key or add the smoke test to normal CI; it depends on external delivery and consumes an email allowance.

## Production gate

Before turning off `emailAndPassword.disableSignUp`, verify a sending domain with Resend; validate end-to-end verification and reset token flows; configure signup throttling and bot protection; and complete authorization and abuse testing.

Do not confuse email transport success with a validated registration system.
