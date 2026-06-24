import type { PodLead } from "@prisma/client";
import { classifyMerchantLead } from "@/lib/lead-finder/classify-lead";

function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function rowForLead(lead: PodLead): string[] {
  const classification =
    lead.leadType && lead.confidenceScore != null
      ? { leadType: lead.leadType, confidenceScore: lead.confidenceScore }
      : classifyMerchantLead({
          email: lead.email,
          shopUrl: lead.shopUrl ?? "",
          shopName: lead.shopName,
          emailSource: "mailto",
          niche: lead.niche,
        });

  return [
    lead.createdAt.toISOString().slice(0, 10),
    lead.niche ?? "",
    lead.shopName ?? "",
    lead.shopUrl ?? "",
    lead.email,
    lead.emailSourceUrl ?? "",
    classification.leadType,
    String(classification.confidenceScore),
    lead.notes ?? "",
  ];
}

export function leadsToCsv(leads: PodLead[]): string {
  const headers = [
    "discovered_date",
    "niche",
    "shop_name",
    "shop_url",
    "email",
    "email_source_url",
    "lead_type",
    "confidence_score",
    "notes",
  ];
  const lines = [headers.join(",")];
  for (const lead of leads) {
    lines.push(rowForLead(lead).map(csvCell).join(","));
  }
  return lines.join("\r\n");
}

export function leadfinderExportFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `leadfinder-${y}-${m}-${d}.csv`;
}
