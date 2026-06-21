import { redirect } from "next/navigation";
import { SeoDashboard } from "@/components/agents/seo/seo-dashboard";
import { auth } from "@/lib/auth/config";
import { getAgentBySlug } from "@/lib/agents/registry";
import { getScanUsage, getWebsiteUsage } from "@/lib/metering/usage";
import { getSeoFreeLimits } from "@/lib/metering/seo-limits";
import { prisma } from "@/lib/db";

export default async function SeoAgentPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const agent = await getAgentBySlug("seo");
  if (!agent || agent.status !== "active") {
    redirect("/dashboard");
  }

  const [websites, limits, scans, websiteUsage] = await Promise.all([
    prisma.website.findMany({
      where: { userId: session.user.id, deletedAt: null, isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        seoScans: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, createdAt: true },
        },
      },
    }),
    getSeoFreeLimits(),
    getScanUsage(session.user.id),
    getWebsiteUsage(session.user.id),
  ]);

  const usage = { limits, scans, websites: websiteUsage };

  return (
    <SeoDashboard
      initialWebsites={websites.map((site) => ({
        ...site,
        seoScans: site.seoScans.map((scan) => ({
          ...scan,
          createdAt: scan.createdAt.toISOString(),
        })),
      }))}
      initialUsage={usage}
    />
  );
}
