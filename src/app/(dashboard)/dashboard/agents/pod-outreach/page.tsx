import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { LeadFinderDashboard } from "@/components/agents/pod-outreach/pod-outreach-dashboard";
import { auth } from "@/lib/auth/config";
import { hasMinimumRole } from "@/lib/auth/roles";
import { getAgentBySlug } from "@/lib/agents/registry";
import { MAX_LEADS } from "@/lib/lead-finder/admin-guard";
import { prisma } from "@/lib/db";

export default async function LeadFinderPage() {
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

  const leads = await prisma.podLead.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <LeadFinderDashboard
      initialLeads={leads.map((lead) => ({
        id: lead.id,
        email: lead.email,
        shopName: lead.shopName,
        shopUrl: lead.shopUrl,
        emailSourceUrl: lead.emailSourceUrl,
        niche: lead.niche,
        leadType: lead.leadType,
        confidenceScore: lead.confidenceScore,
        notes: lead.notes,
        createdAt: lead.createdAt.toISOString(),
      }))}
      maxLeads={MAX_LEADS}
    />
  );
}
