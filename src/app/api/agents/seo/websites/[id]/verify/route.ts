import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { verifyMetaTag } from "@/lib/seo/verification";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const website = await prisma.website.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  });

  if (!website || !website.verificationToken) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const verified = await verifyMetaTag(website.domain, website.verificationToken);

  if (!verified) {
    return NextResponse.json(
      {
        error:
          "Verification meta tag not found on homepage. Add the tag to your <head> and try again.",
      },
      { status: 400 },
    );
  }

  const updated = await prisma.website.update({
    where: { id },
    data: {
      verificationStatus: "verified",
      verifiedAt: new Date(),
    },
  });

  return NextResponse.json({ website: updated });
}
