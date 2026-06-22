import nodemailer from "nodemailer";
import type { PodLead } from "@prisma/client";

export type SendMode = "send" | "draft";

export type SendResult =
  | { mode: "send"; messageId?: string }
  | { mode: "draft"; saved: true };

function isSmtpConfigured(): boolean {
  return Boolean(process.env.POD_SMTP_HOST && process.env.POD_SMTP_USER);
}

export async function deliverOutreachEmail(
  lead: Pick<PodLead, "email" | "subject" | "bodyHtml" | "bodyText">,
  mode: SendMode,
): Promise<SendResult> {
  if (!lead.subject || !lead.bodyText) {
    throw new Error("Lead is missing subject or body");
  }

  if (mode === "draft") {
    return { mode: "draft", saved: true };
  }

  if (!isSmtpConfigured()) {
    console.info("\n--- [pod outreach dev send] ---");
    console.info(`To: ${lead.email}`);
    console.info(`Subject: ${lead.subject}`);
    console.info(lead.bodyText);
    console.info("---\n");
    return { mode: "send" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.POD_SMTP_HOST,
    port: Number(process.env.POD_SMTP_PORT ?? 587),
    secure: process.env.POD_SMTP_SECURE === "true",
    auth: {
      user: process.env.POD_SMTP_USER,
      pass: process.env.POD_SMTP_PASS,
    },
  });

  const fromName = process.env.POD_SMTP_FROM_NAME ?? "MockupExpo";
  const fromEmail = process.env.POD_SMTP_FROM ?? process.env.POD_SMTP_USER;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: lead.email,
    subject: lead.subject,
    text: lead.bodyText,
    html: lead.bodyHtml ?? undefined,
  });

  return { mode: "send", messageId: info.messageId };
}

export function getSmtpStatus() {
  return {
    configured: isSmtpConfigured(),
    host: process.env.POD_SMTP_HOST ?? null,
    from: process.env.POD_SMTP_FROM ?? process.env.POD_SMTP_USER ?? null,
  };
}
