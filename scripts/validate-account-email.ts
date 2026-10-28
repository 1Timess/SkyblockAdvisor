import { sendAccountEmail } from "../src/server/email/send-account-email";

async function main() {
  const recipient = process.env.RESEND_TEST_TO?.trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error("Configure RESEND_TEST_TO with a valid test inbox address.");
  }
  if (!process.env.RESEND_API_KEY?.trim() || !process.env.RESEND_FROM_EMAIL?.trim()) {
    throw new Error("Configure RESEND_API_KEY and RESEND_FROM_EMAIL in .env.local.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("This email smoke test is restricted to non-production environments.");
  }

  // Sends exactly one non-sensitive message to an explicitly selected inbox.
  await sendAccountEmail({
    to: recipient,
    subject: "Statixel email delivery test",
    text: "This is a test of Statixel's transactional email transport. No action is required.",
  });
  console.log("Resend accepted one test message. Confirm receipt in the configured inbox.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Email smoke test failed.");
  process.exitCode = 1;
});
