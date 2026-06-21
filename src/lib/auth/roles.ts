import { UserRole } from "@prisma/client";

const ROLE_RANK: Record<UserRole, number> = {
  user: 0,
  support: 1,
  admin: 2,
  super_admin: 3,
};

export function hasMinimumRole(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isStaffRole(role: UserRole): boolean {
  return hasMinimumRole(role, UserRole.support);
}

/** Edge-safe staff check for middleware (string role from JWT). */
export function isStaffRoleName(role: string | undefined): boolean {
  return role === "support" || role === "admin" || role === "super_admin";
}
