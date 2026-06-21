import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function DELETE(
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

  if (!website) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.website.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  return NextResponse.json({ ok: true });
}
