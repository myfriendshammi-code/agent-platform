import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getScanUsage, getWebsiteUsage } from "@/lib/metering/usage";
import { getSeoFreeLimits } from "@/lib/metering/seo-limits";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [limits, scans, websites] = await Promise.all([
    getSeoFreeLimits(),
    getScanUsage(session.user.id),
    getWebsiteUsage(session.user.id),
  ]);

  return NextResponse.json({ limits, scans, websites });
}
