import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MAX_LEADS, requirePodOutreachAdmin } from "@/lib/pod-outreach/admin-guard";
import { parseLeadsCsv } from "@/lib/pod-outreach/csv-import";
import { generateOutreachEmail } from "@/lib/pod-outreach/generate-email";

export async function POST(request: Request) {
  const authResult = await requirePodOutreachAdmin();
  if (authResult.error) return authResult.error;

  const userId = authResult.session.user.id;
  const contentType = request.headers.get("content-type") ?? "";

  let csvText: string;
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a CSV file as 'file'" }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    const body = (await request.json()) as { csv?: string };
    if (!body.csv?.trim()) {
      return NextResponse.json({ error: "Provide CSV text or upload a file" }, { status: 400 });
    }
    csvText = body.csv;
  }

  const existingCount = await prisma.podLead.count({ where: { userId } });
  const remainingSlots = Math.max(0, MAX_LEADS - existingCount);
  if (remainingSlots === 0) {
    return NextResponse.json(
      { error: `Lead limit reached (${MAX_LEADS}). Delete leads before importing more.` },
      { status: 403 },
    );
  }

  const parsed = parseLeadsCsv(csvText, remainingSlots);
  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { error: parsed.errors[0] ?? "No valid rows found", errors: parsed.errors },
      { status: 400 },
    );
  }

  let imported = 0;
  let duplicates = 0;
  const importErrors: string[] = [...parsed.errors];

  for (const row of parsed.rows) {
    const emailContent = generateOutreachEmail({
      name: row.name ?? null,
      shopName: row.shopName ?? null,
      shopUrl: row.shopUrl ?? null,
      niche: row.niche ?? null,
    });

    try {
      await prisma.podLead.create({
        data: {
          userId,
          email: row.email,
          name: row.name,
          shopName: row.shopName,
          shopUrl: row.shopUrl,
          niche: row.niche,
          notes: row.notes,
          subject: emailContent.subject,
          bodyHtml: emailContent.bodyHtml,
          bodyText: emailContent.bodyText,
        },
      });
      imported++;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        duplicates++;
      } else {
        importErrors.push(`Failed to import ${row.email}`);
      }
    }
  }

  return NextResponse.json({
    imported,
    duplicates,
    skipped: parsed.skipped,
    errors: importErrors,
    total: existingCount + imported,
  });
}
