import { redirect } from "next/navigation";
import { ScanReport } from "@/components/agents/seo/scan-report";
import { auth } from "@/lib/auth/config";
import { getAgentBySlug } from "@/lib/agents/registry";

export default async function SeoScanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const agent = await getAgentBySlug("seo");
  if (!agent || agent.status !== "active") {
    redirect("/dashboard");
  }

  const { id } = await params;

  return <ScanReport scanId={id} />;
}
