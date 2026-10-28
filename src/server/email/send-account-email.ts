import "server-only";

type AccountEmail = {
  to: string;
  subject: string;
  text: string;
};

// Fail closed until an explicit sender and API key are configured.
// No verification links, reset links, or email addresses are logged.
export async function sendAccountEmail(message: AccountEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    throw new Error("Account email delivery is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    // Never expose provider response bodies: they can include recipient data.
    throw new Error(`Account email delivery failed (HTTP ${response.status}).`);
  }
}
