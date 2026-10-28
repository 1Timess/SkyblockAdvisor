import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { getDatabase } from "@/server/db";
import * as schema from "@/server/db/schema";

function authSecret() {
  const value = process.env.BETTER_AUTH_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error("Configure BETTER_AUTH_SECRET with at least 32 characters.");
  }
  return value;
}

export const auth = betterAuth({
  appName: "Statixel",
  secret: authSecret(),
  database: drizzleAdapter(getDatabase(), { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    // Registration is closed until verified email delivery and abuse controls exist.
    disableSignUp: true,
  },
});
