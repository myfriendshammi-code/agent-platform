import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { PodOutreachDashboard } from "@/components/agents/pod-outreach/pod-outreach-dashboard";
import { auth } from "@/lib/auth/config";
import { hasMinimumRole } from "@/lib/auth/roles";
import { getAgentBySlug } from "@/lib/agents/registry";
import { prisma } from "@/lib/db";
import { MAX_LEADS } from "@/lib/pod-outreach/admin-guard";
import { getDailySendUsage } from "@/lib/pod-outreach/daily-limit";
import { getSmtpStatus } from "@/lib/pod-outreach/send-email";

export default async function PodOutreachPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!hasMinimumRole(session.user.role, UserRole.admin)) {
    redirect("/dashboard");
  }

  const agent = await getAgentBySlug("pod-outreach");
  if (!agent || agent.status !== "active") {
    redirect("/dashboard");
  }

  const [leads, usage, smtp] = await Promise.all([
    prisma.podLead.findMany({
      where: { userId: session.user.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    getDailySendUsage(session.user.id),
    Promise.resolve(getSmtpStatus()),
  ]);

  return (
    <PodOutreachDashboard
      initialLeads={leads.map((lead) => ({
        ...lead,
        sentAt: lead.sentAt?.toISOString() ?? null,
        createdAt: lead.createdAt.toISOString(),
      }))}
      initialUsage={usage}
      smtpConfigured={smtp.configured}
      maxLeads={MAX_LEADS}
    />
  );
}
