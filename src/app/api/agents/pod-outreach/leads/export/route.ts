import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLeadFinderAdmin } from "@/lib/lead-finder/admin-guard";
import { leadfinderExportFilename, leadsToCsv } from "@/lib/lead-finder/export-csv";

export async function GET() {
  const authResult = await requireLeadFinderAdmin();
  if (authResult.error) return authResult.error;

  const leads = await prisma.podLead.findMany({
    where: { userId: authResult.session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const csv = leadsToCsv(leads);
  const filename = leadfinderExportFilename();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
