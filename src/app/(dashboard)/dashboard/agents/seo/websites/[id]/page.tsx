import { notFound, redirect } from "next/navigation";
import { WebsiteDetail } from "@/components/agents/seo/website-detail";
import { auth } from "@/lib/auth/config";
import { getAgentBySlug } from "@/lib/agents/registry";
import { getScanUsage } from "@/lib/metering/usage";
import { metaTagSnippet } from "@/lib/seo/verification";
import { prisma } from "@/lib/db";

export default async function SeoWebsitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const agent = await getAgentBySlug("seo");
  if (!agent || agent.status !== "active") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const website = await prisma.website.findFirst({
    where: { id, userId: session.user.id, deletedAt: null, isActive: true },
  });

  if (!website) {
    notFound();
  }

  const [scans, scanUsage] = await Promise.all([
    prisma.seoScan.findMany({
      where: { websiteId: website.id, userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { report: { select: { id: true } } },
    }),
    getScanUsage(session.user.id),
  ]);

  const metaSnippet =
    website.verificationStatus !== "verified" && website.verificationToken
      ? metaTagSnippet(website.verificationToken)
      : null;

  return (
    <WebsiteDetail
      website={website}
      scans={scans.map((scan) => ({
        ...scan,
        createdAt: scan.createdAt.toISOString(),
      }))}
      scanUsage={scanUsage}
      metaSnippet={metaSnippet}
    />
  );
}
