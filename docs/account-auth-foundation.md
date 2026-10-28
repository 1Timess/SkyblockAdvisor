# Account authentication foundation

The auth handler uses Better Auth's Next.js App Router integration and the PostgreSQL Drizzle adapter. Public SkyBlock profile endpoints are unchanged.

**Registration is intentionally disabled** until verified email delivery, signup protections, migrations, and integration testing are complete. No customer-facing registration or login UI has been added.

## Local configuration

Set `DATABASE_URL`, `BETTER_AUTH_URL=http://localhost:3000`, and an unpredictable `BETTER_AUTH_SECRET` with at least 32 characters in the untracked `.env.local`.

Start local PostgreSQL with `docker compose up -d postgres`.

## Schema generation

Before using the auth endpoints, generate the Better Auth tables using the installed major/minor version of the Better Auth CLI. Do not apply migrations until the schema and generated SQL have been reviewed. The current `src/server/db/schema.ts` is an intentional placeholder.

We will replace that placeholder with the generated tables, register the schema with the adapter, and commit Drizzle migrations in the next step.

The auth integration is **not yet runtime validated**, and no production claims should be made until the full validation suite passes.
