# Local PostgreSQL for account infrastructure

This setup provides an isolated local PostgreSQL development database. The application does not yet require a database for public SkyBlock profile requests.

1. Install Docker Desktop with Docker Compose support.
2. Run `docker compose up -d postgres`.
3. Copy the relevant entries from `.env.example` into your untracked `.env.local`.
4. Check the container with `docker compose ps`.
5. Stop with `docker compose down`.

The container binds only to `127.0.0.1:5432` on the host. The sample credentials are **local development only**; never reuse them on a deployed instance.

The named volume retains data across `docker compose down`. Running `docker compose down -v` deletes the local database.

## Drizzle migration workflow

The database connection helper is lazy, so ordinary public profile requests do not depend on PostgreSQL.

After the authentication schema is generated and reviewed, create migrations with `npx drizzle-kit generate`, and apply them with `npx drizzle-kit migrate`. Do not use `drizzle-kit push` as a substitute for reviewed, versioned migrations.

The authentication routes, generated schema, and first migration have **not yet been implemented**.
