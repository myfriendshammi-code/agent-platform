import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { writeAuditLog } from "@/lib/audit/write";
import { hashToken, verificationExpiry, generateToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { sendEmail, verificationEmail } from "@/lib/email/send";

export async function POST(request: Request) {
  const session = await auth();
  let userId = session?.user?.id;
  let email = session?.user?.email;

  if (!userId) {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    if (body.email) {
      const user = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
      });
      if (user && !user.emailVerified) {
        userId = user.id;
        email = user.email;
      }
    }
  }

  if (!userId || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: "Already verified" }, { status: 400 });
  }

  const token = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: verificationExpiry(),
    },
  });

  await sendEmail(verificationEmail(user.email, token));

  return NextResponse.json({ ok: true });
}

const verifySchema = z.object({
  token: z.string().min(1),
});

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await writeAuditLog({
      targetUserId: record.userId,
      action: "auth.email_verified",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[verify-email]", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
