import { NextResponse } from "next/server";
import { PodLeadStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePodOutreachAdmin } from "@/lib/pod-outreach/admin-guard";

const patchSchema = z.object({
  status: z.enum(["draft", "sent", "replied", "interested"]).optional(),
  subject: z.string().min(1).max(500).optional(),
  bodyText: z.string().min(1).optional(),
  bodyHtml: z.string().optional(),
  name: z.string().max(255).optional(),
  shopName: z.string().max(255).optional(),
  shopUrl: z.string().optional(),
  niche: z.string().max(255).optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePodOutreachAdmin();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }

  const lead = await prisma.podLead.findFirst({
    where: { id, userId: authResult.session.user.id },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.status === PodLeadStatus.draft && lead.status !== PodLeadStatus.draft) {
    data.sentAt = null;
  }

  const updated = await prisma.podLead.update({
    where: { id },
    data,
  });

  return NextResponse.json({ lead: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePodOutreachAdmin();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  const lead = await prisma.podLead.findFirst({
    where: { id, userId: authResult.session.user.id },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await prisma.podLead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
