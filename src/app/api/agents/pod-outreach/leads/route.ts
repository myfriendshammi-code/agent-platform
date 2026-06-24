import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLeadFinderAdmin } from "@/lib/lead-finder/admin-guard";

export async function GET() {
  const authResult = await requireLeadFinderAdmin();
  if (authResult.error) return authResult.error;

  const userId = authResult.session.user.id;
  const leads = await prisma.podLead.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    leads,
    total: leads.length,
  });
}
