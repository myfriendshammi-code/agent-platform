import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type AuditInput = {
  actorUserId?: string | null;
  targetUserId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

export async function writeAuditLog(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      action: input.action,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
