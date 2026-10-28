import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be provided in the process environment.");

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  await client.connect();

  try {
    const database = await client.query<{ name: string; user_name: string }>(
      "SELECT current_database() AS name, current_user AS user_name",
    );
    console.log(`Connected to database ${database.rows[0]?.name} as ${database.rows[0]?.user_name}`);

    const tables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [["user", "session", "account", "verification"]],
    );
    const present = new Set(tables.rows.map((row) => row.table_name));
    const missing = ["user", "session", "account", "verification"].filter((name) => !present.has(name));
    if (missing.length) throw new Error(`Missing authentication tables: ${missing.join(", ")}`);

    const constraints = await client.query<{ table_name: string; constraint_type: string }>(
      `SELECT table_name, constraint_type FROM information_schema.table_constraints
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [["user", "session", "account", "verification"]],
    );
    for (const table of ["user", "session", "account", "verification"]) {
      if (!constraints.rows.some((row) => row.table_name === table && row.constraint_type === "PRIMARY KEY")) {
        throw new Error(`Missing primary key on ${table}`);
      }
    }
    for (const table of ["session", "account"]) {
      if (!constraints.rows.some((row) => row.table_name === table && row.constraint_type === "FOREIGN KEY")) {
        throw new Error(`Missing user foreign key on ${table}`);
      }
    }

    const journal = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM information_schema.tables
       WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'`,
    );
    if (journal.rows[0]?.count !== "1") throw new Error("Drizzle migration history table is missing.");
    console.log("PASS: four authentication tables, primary keys, user foreign keys, and migration journal.");
  } finally {
    await client.end();
  }

  // Optional HTTP test; no accounts are created and no credentials are sent.
  const baseURL = process.env.BETTER_AUTH_URL;
  if (baseURL) {
    const response = await fetch(new URL("/api/auth/get-session", baseURL), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Session endpoint returned HTTP ${response.status}`);
    const body: unknown = await response.json();
    if (body !== null) throw new Error("Expected no authenticated session for an anonymous request.");
    console.log("PASS: anonymous session endpoint returns null.");
  } else {
    console.log("SKIP: HTTP session check (BETTER_AUTH_URL not supplied).");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
