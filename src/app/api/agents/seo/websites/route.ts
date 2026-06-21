import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { assertCanAddWebsite } from "@/lib/metering/usage";
import { normalizeDomain } from "@/lib/seo/domain";
import { generateVerificationToken, metaTagSnippet } from "@/lib/seo/verification";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const websites = await prisma.website.findMany({
    where: { userId: session.user.id, deletedAt: null, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      seoScans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ websites });
}

const createSchema = z.object({
  domain: z.string().min(3),
  displayName: z.string().max(255).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const domain = normalizeDomain(parsed.data.domain);
    if (!domain) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    const canAdd = await assertCanAddWebsite(session.user.id);
    if (!canAdd.ok) {
      return NextResponse.json({ error: canAdd.message }, { status: 403 });
    }

    const token = generateVerificationToken();

    const website = await prisma.website.create({
      data: {
        userId: session.user.id,
        domain,
        displayName: parsed.data.displayName ?? domain,
        verificationMethod: "meta_tag",
        verificationToken: token,
      },
    });

    return NextResponse.json({
      website,
      verification: {
        method: "meta_tag",
        snippet: metaTagSnippet(token),
        instructions:
          "Add the meta tag to your homepage <head>, then click Verify ownership on the website page.",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Website already added" }, { status: 409 });
    }
    console.error("[seo websites POST]", error);
    return NextResponse.json({ error: "Failed to add website" }, { status: 500 });
  }
}
