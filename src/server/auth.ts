import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { captcha } from "better-auth/plugins";
import { getDatabase } from "@/server/db";
import * as schema from "@/server/db/schema";
import { sendAccountEmail } from "@/server/email/send-account-email";

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
  // Registration stays disabled. Turnstile is activated only when configured.
  plugins: process.env.TURNSTILE_SECRET_KEY?.trim()
    ? [captcha({
        provider: "cloudflare-turnstile",
        secretKey: process.env.TURNSTILE_SECRET_KEY.trim(),
        endpoints: ["/sign-up/email", "/sign-in/email", "/request-password-reset"],
      })]
    : [],
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAccountEmail({
        to: user.email,
        subject: "Verify your Statixel email",
        text: `Verify your email address using this link: ${url}`,
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAccountEmail({
        to: user.email,
        subject: "Reset your Statixel password",
        text: `Reset your password using this link: ${url}`,
      });
    },
    // Registration is closed until verified email delivery and abuse controls exist.
    disableSignUp: true,
  },
});
