import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | undefined;

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("Configure DATABASE_URL in the server environment.");

  pool ??= new Pool({ connectionString, max: 10 });
  return drizzle({ client: pool });
}
