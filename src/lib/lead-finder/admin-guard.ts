import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasMinimumRole } from "@/lib/auth/roles";

export const LEAD_FINDER_SLUG = "pod-outreach";
export const MAX_LEADS = 500;

export async function requireLeadFinderAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!hasMinimumRole(session.user.role, UserRole.admin)) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { session };
}
