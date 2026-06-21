import { NextResponse } from "next/server";
import { z } from "zod";
import { generateToken, hashToken, resetExpiry } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { passwordResetEmail, sendEmail } from "@/lib/email/send";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return ok to avoid email enumeration
    if (user && user.passwordHash) {
      const token = generateToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: resetExpiry(),
        },
      });
      await sendEmail(passwordResetEmail(email, token));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
