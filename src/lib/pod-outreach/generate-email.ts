import type { PodLead } from "@prisma/client";

const MOCKUPEXPO_URL =
  process.env.POD_MOCKUPEXPO_URL ?? "https://mockupexpo.com?utm_source=pod-outreach";

type LeadFields = Pick<PodLead, "name" | "shopName" | "shopUrl" | "niche">;

function displayName(lead: LeadFields): string {
  if (lead.name?.trim()) return lead.name.trim();
  if (lead.shopName?.trim()) return lead.shopName.trim();
  return "there";
}

function shopLabel(lead: LeadFields): string {
  if (lead.shopName?.trim()) return lead.shopName.trim();
  if (lead.shopUrl?.trim()) return lead.shopUrl.trim();
  return "your shop";
}

function nicheLabel(lead: LeadFields): string {
  return lead.niche?.trim() || "POD";
}

export function generateOutreachEmail(lead: LeadFields): {
  subject: string;
  bodyHtml: string;
  bodyText: string;
} {
  const name = displayName(lead);
  const shop = shopLabel(lead);
  const niche = nicheLabel(lead);

  const subject = `Better mockups for ${shop}?`;

  const bodyText = `Hi ${name},

I came across ${shop} while looking at ${niche} print-on-demand sellers.

Most listings in this niche still use flat product PNGs. MockupExpo helps POD sellers turn those into lifestyle mockups in minutes — so listings look more professional and convert better.

If you're open to it, I'd love to show you a quick before/after on one of your products:
${MOCKUPEXPO_URL}

No pressure — just reply if you'd like a free walkthrough.

Best,
MockupExpo Team`;

  const bodyHtml = `<p>Hi ${escapeHtml(name)},</p>
<p>I came across <strong>${escapeHtml(shop)}</strong> while looking at ${escapeHtml(niche)} print-on-demand sellers.</p>
<p>Most listings in this niche still use flat product PNGs. <strong>MockupExpo</strong> helps POD sellers turn those into lifestyle mockups in minutes — so listings look more professional and convert better.</p>
<p>If you're open to it, I'd love to show you a quick before/after on one of your products:<br/>
<a href="${escapeHtml(MOCKUPEXPO_URL)}">${escapeHtml(MOCKUPEXPO_URL)}</a></p>
<p>No pressure — just reply if you'd like a free walkthrough.</p>
<p>Best,<br/>MockupExpo Team</p>`;

  return { subject, bodyHtml, bodyText };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
