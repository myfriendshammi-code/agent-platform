import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const scan = await prisma.seoScan.findFirst({
    where: { id, userId: session.user.id },
    include: {
      website: { select: { domain: true, displayName: true } },
      issues: { orderBy: [{ severity: "asc" }, { category: "asc" }] },
      report: { select: { summary: true } },
    },
  });

  if (!scan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(scan);
}
