import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { writeAuditLog } from "@/lib/audit/write";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(255),
});

export async function PATCH(request: Request) {
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

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      targetUserId: session.user.id,
      action: "user.profile_update",
      metadata: { name: parsed.data.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[profile]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
