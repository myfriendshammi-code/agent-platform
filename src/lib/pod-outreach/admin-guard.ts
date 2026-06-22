import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasMinimumRole } from "@/lib/auth/roles";

export const POD_OUTREACH_SLUG = "pod-outreach";
export const MAX_LEADS = 50;
export const MAX_SENDS_PER_DAY = 20;

export async function requirePodOutreachAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!hasMinimumRole(session.user.role, UserRole.admin)) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { session };
}
