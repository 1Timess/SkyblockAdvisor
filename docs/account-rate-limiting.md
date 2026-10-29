# Persistent authentication rate limits — staged migration

## State

This pass defines the Better Auth `rateLimit` table in the existing PostgreSQL Drizzle schema. **It does not enable database-backed rate limiting yet.** Enabling storage before the table exists would break requests.

Better Auth's documented model consists of an ID primary key, unique key, integer count, and millisecond-epoch lastRequest (bigint). The table name and columns are part of the library contract; they are not Statixel-specific analytics records.

## Local database migration

First pull the latest `main`. Then, while `.env.local` still points at the Statixel Docker database, generate a migration without applying it:

```powershell
npx drizzle-kit generate
```

Check the generated SQL carefully. It should only create the rate-limit table and its unique key constraint. Do not run `drizzle-kit push` or regenerate the existing initial migration.

After reviewing the SQL, run `npx drizzle-kit migrate`, then inspect the new table:

```powershell
docker compose exec postgres psql -U statixel -d statixel -c '\d "rateLimit"'
```

Commit the generated SQL **and** `drizzle/meta` snapshots. Ignore unrelated local validation files and `next-env.d.ts`.

## Next code pass

Once migration and validation succeed, configure Better Auth's `rateLimit` object with `storage: "database"`, `enabled: true`, and narrowly scoped custom endpoint rules. Test actual 429 behavior and expiration before declaring protection operational.

Network identity behind reverse proxies must be treated separately. Do not trust unverified forwarding headers. Shared-IP false positives and rotating-IP bypass are out of scope for the table-only migration.
