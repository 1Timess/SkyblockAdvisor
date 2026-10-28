# Local PostgreSQL for account infrastructure

This file documents the **database container only**. Better Auth, Drizzle, authentication routes, and migrations are not yet installed or enabled.

1. Install Docker Engine / Docker Desktop with Docker Compose support.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Copy the relevant values from `.env.example` into your untracked `.env.local`.
4. Confirm PostgreSQL is running using `docker compose ps`.
5. Stop the container with `docker compose down`.

The container binds only to 127.0.0.1:5432 on the host. Credentials are intentionally public and **only for local development**. Do not publish the port or use these credentials with a deployed database.

The named Docker volume persists data across `docker compose down`. `docker compose down -v` **deletes the local database volume**.

The database is not yet used by public profile routes; they must continue working without PostgreSQL.
