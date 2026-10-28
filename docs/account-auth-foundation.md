# Account authentication foundation

The auth handler uses Better Auth's Next.js App Router integration and the PostgreSQL Drizzle adapter. Public SkyBlock profile endpoints are unchanged.

**Registration remains disabled** until verified email delivery, signup protections, and end-to-end authentication tests are complete. No customer-facing account UI has been added.

## Local environment

Configure `DATABASE_URL`, `BETTER_AUTH_URL=http://localhost:3000`, and a unique `BETTER_AUTH_SECRET` of at least 32 characters in the untracked `.env.local`. The Docker database in `compose.yaml` maps host port **5433** to PostgreSQL port 5432.

## Migration workflow

The generated schema is committed in `src/server/db/schema.ts`, alongside the reviewed initial SQL migration in `drizzle/`. Use `npx drizzle-kit generate` to create subsequent migrations and `npx drizzle-kit migrate` to apply committed migrations. Do not replace the versioned migration workflow with `drizzle-kit push`.

## Integration smoke check (read-only)

Run `docker compose up -d postgres`. In a separate terminal start `npm run dev`. Then run:

```powershell
node --env-file=.env.local --import tsx scripts/validate-account-foundation.ts
```

The script validates the database tables, key constraints and migration journal, then calls `GET /api/auth/get-session` without cookies to check the unauthenticated response.

This script is intentionally **not** included in `npm test` because the regular test suite must remain offline and runnable without PostgreSQL. The smoke check does not register users, write to the database, or verify login/password/session expiry.

If the HTTP check fails, confirm the dev server is running and the `BETTER_AUTH_URL` points to that server. Report the actual output rather than changing authentication behavior to satisfy a test.
