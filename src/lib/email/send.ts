export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "noreply@agentplatform.local";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  if (!apiKey) {
    console.info("\n--- [dev email] ---");
    console.info(`To: ${payload.to}`);
    console.info(`Subject: ${payload.subject}`);
    console.info(payload.text);
    console.info(`App URL: ${appUrl}`);
    console.info("---\n");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email send failed: ${response.status} ${body}`);
  }
}

export function verificationEmail(to: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const link = `${appUrl}/verify-email/${token}`;

  return {
    to,
    subject: "Verify your AgentPlatform email",
    html: `<p>Welcome to AgentPlatform.</p><p><a href="${link}">Verify your email</a></p><p>This link expires in 24 hours.</p>`,
    text: `Welcome to AgentPlatform. Verify your email: ${link}\n\nThis link expires in 24 hours.`,
  };
}

export function passwordResetEmail(to: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const link = `${appUrl}/reset-password/${token}`;

  return {
    to,
    subject: "Reset your AgentPlatform password",
    html: `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour.</p>`,
    text: `Reset your password: ${link}\n\nThis link expires in 1 hour.`,
  };
}
