import { NextResponse } from "next/server";
import { PodLeadStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePodOutreachAdmin } from "@/lib/pod-outreach/admin-guard";
import { assertCanSendToday } from "@/lib/pod-outreach/daily-limit";
import { deliverOutreachEmail } from "@/lib/pod-outreach/send-email";

const sendSchema = z.object({
  mode: z.enum(["send", "draft"]).default("send"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePodOutreachAdmin();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const userId = authResult.session.user.id;

  const body = await request.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);
  const mode = parsed.success ? parsed.data.mode : "send";

  const lead = await prisma.podLead.findFirst({
    where: { id, userId },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (!lead.subject || !lead.bodyText) {
    return NextResponse.json({ error: "Generate or edit email content first" }, { status: 400 });
  }

  if (mode === "send") {
    if (lead.status !== PodLeadStatus.draft) {
      return NextResponse.json({ error: "Only draft leads can be sent" }, { status: 400 });
    }

    const canSend = await assertCanSendToday(userId);
    if (!canSend.ok) {
      return NextResponse.json({ error: canSend.message, usage: canSend.usage }, { status: 403 });
    }

    await deliverOutreachEmail(lead, "send");

    const updated = await prisma.podLead.update({
      where: { id },
      data: {
        status: PodLeadStatus.sent,
        sentAt: new Date(),
      },
    });

    const usage = await assertCanSendToday(userId);
    return NextResponse.json({ lead: updated, usage: usage.ok ? usage.usage : canSend.usage });
  }

  const updated = await prisma.podLead.update({
    where: { id },
    data: { status: PodLeadStatus.draft },
  });

  return NextResponse.json({
    lead: updated,
    message: "Saved as draft. Copy content to Gmail or click Send when ready.",
  });
}
