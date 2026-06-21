import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/write";
import { generateToken, hashToken, verificationExpiry } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { sendEmail, verificationEmail } from "@/lib/email/send";

const registerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash,
      },
    });

    const token = generateToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: verificationExpiry(),
      },
    });

    await sendEmail(verificationEmail(email, token));

    await writeAuditLog({
      targetUserId: user.id,
      action: "auth.register",
      metadata: { email },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
