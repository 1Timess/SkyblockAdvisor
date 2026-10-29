# Turnstile local validation

Better Auth's CAPTCHA plugin protects `/sign-up/email`, `/sign-in/email` and `/request-password-reset` only when `TURNSTILE_SECRET_KEY` is configured. Registration is still disabled.

## Local diagnostic

With Cloudflare's official always-pass testing keys configured in your untracked `.env.local`, start the Next.js dev server then run:

```powershell
node --env-file=.env.local --import tsx scripts/validate-account-turnstile.ts
```

This sends **two requests** to the local sign-in endpoint using the reserved nonexistent domain `invalid.example` and a deliberately invalid password. One request omits the CAPTCHA header; the other uses Cloudflare's documented `XXXX.DUMMY.TOKEN.XXXX` token. It must not sign in, create users, or send any real credentials.

The probe reports HTTP status codes and machine-readable error codes. Differing responses give diagnostic evidence but do **not** by themselves prove a verified human request, a complete sign-in flow, or real anti-bot protection. Identical responses are explicitly marked inconclusive, not passed. All responses must reject authentication.

## Important limitations

- Do not use test keys in production.
- The always-pass testing secret does not test malicious-token rejection; use Cloudflare's documented always-fail testing secret in a separate controlled test once error handling is ready.
- This diagnostic does not test account creation because it remains disabled.
- Persistent signup/login throttling and Vera spending limits remain separate requirements.
