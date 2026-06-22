import { PodLeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MAX_SENDS_PER_DAY } from "@/lib/pod-outreach/admin-guard";

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function getDailySendUsage(userId: string) {
  const since = startOfUtcDay();
  const sentToday = await prisma.podLead.count({
    where: {
      userId,
      status: { in: [PodLeadStatus.sent, PodLeadStatus.replied, PodLeadStatus.interested] },
      sentAt: { gte: since },
    },
  });

  return {
    sentToday,
    limit: MAX_SENDS_PER_DAY,
    remaining: Math.max(0, MAX_SENDS_PER_DAY - sentToday),
  };
}

export async function assertCanSendToday(userId: string, count = 1) {
  const usage = await getDailySendUsage(userId);
  if (usage.remaining < count) {
    return {
      ok: false as const,
      message: `Daily send limit reached (${usage.sentToday}/${usage.limit}). Try again tomorrow.`,
      usage,
    };
  }
  return { ok: true as const, usage };
}
