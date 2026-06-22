import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePodOutreachAdmin } from "@/lib/pod-outreach/admin-guard";
import { generateOutreachEmail } from "@/lib/pod-outreach/generate-email";

export async function POST() {
  const authResult = await requirePodOutreachAdmin();
  if (authResult.error) return authResult.error;

  const userId = authResult.session.user.id;

  const leads = await prisma.podLead.findMany({
    where: { userId },
  });

  let updated = 0;
  for (const lead of leads) {
    const emailContent = generateOutreachEmail(lead);
    await prisma.podLead.update({
      where: { id: lead.id },
      data: {
        subject: emailContent.subject,
        bodyHtml: emailContent.bodyHtml,
        bodyText: emailContent.bodyText,
      },
    });
    updated++;
  }

  return NextResponse.json({ updated });
}
