import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Match Next.js local development: never overwrite an already exported environment variable.
config({ path: ".env.local", override: false, quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
