import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePodOutreachAdmin } from "@/lib/pod-outreach/admin-guard";
import { getDailySendUsage } from "@/lib/pod-outreach/daily-limit";
import { getSmtpStatus } from "@/lib/pod-outreach/send-email";

export async function GET() {
  const authResult = await requirePodOutreachAdmin();
  if (authResult.error) return authResult.error;

  const userId = authResult.session.user.id;

  const [leads, usage, smtp] = await Promise.all([
    prisma.podLead.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    getDailySendUsage(userId),
    Promise.resolve(getSmtpStatus()),
  ]);

  const statusCounts = leads.reduce(
    (acc, lead) => {
      acc[lead.status] = (acc[lead.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return NextResponse.json({
    leads,
    usage,
    smtp,
    statusCounts,
    total: leads.length,
  });
}
