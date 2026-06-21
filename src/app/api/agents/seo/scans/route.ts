import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { assertCanScan, incrementScanCount } from "@/lib/metering/usage";
import { getSeoFreeLimits } from "@/lib/metering/seo-limits";
import { enqueueSeoScan } from "@/lib/queue/seo-scan";
import { prisma } from "@/lib/db";

const schema = z.object({
  websiteId: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const website = await prisma.website.findFirst({
      where: {
        id: parsed.data.websiteId,
        userId: session.user.id,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    if (website.verificationStatus !== "verified") {
      return NextResponse.json(
        { error: "Verify domain ownership before running a scan." },
        { status: 403 },
      );
    }

    const canScan = await assertCanScan(session.user.id);
    if (!canScan.ok) {
      return NextResponse.json({ error: canScan.message }, { status: 403 });
    }

    const limits = await getSeoFreeLimits();

    const scan = await prisma.seoScan.create({
      data: {
        userId: session.user.id,
        websiteId: website.id,
        pagesLimit: limits.pages_per_scan,
      },
    });

    await incrementScanCount(session.user.id);

    try {
      await enqueueSeoScan(scan.id);
    } catch (error) {
      await prisma.seoScan.update({
        where: { id: scan.id },
        data: {
          status: "failed",
          errorMessage: "Scan queue unavailable. Is Redis running? Start the worker with npm run worker:dev",
          completedAt: new Date(),
        },
      });
      console.error("[seo scan enqueue]", error);
      return NextResponse.json(
        { error: "Scan queue unavailable. Ensure Redis and the worker are running." },
        { status: 503 },
      );
    }

    return NextResponse.json({ scan });
  } catch (error) {
    console.error("[seo scans POST]", error);
    return NextResponse.json({ error: "Failed to start scan" }, { status: 500 });
  }
}
