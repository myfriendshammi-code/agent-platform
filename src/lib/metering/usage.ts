import { prisma } from "@/lib/db";
import { currentPeriod, getSeoFreeLimits } from "@/lib/metering/seo-limits";

async function getSeoAgentId(): Promise<string> {
  const agent = await prisma.agent.findUniqueOrThrow({ where: { slug: "seo" } });
  return agent.id;
}

async function getOrCreatePeriod(userId: string, agentId: string, period: string) {
  return prisma.usagePeriod.upsert({
    where: { userId_agentId_period: { userId, agentId, period } },
    create: { userId, agentId, period },
    update: {},
  });
}

async function getCounter(usagePeriodId: string, metric: string) {
  return prisma.usageCounter.upsert({
    where: { usagePeriodId_metric: { usagePeriodId, metric } },
    create: { usagePeriodId, metric, count: 0 },
    update: {},
  });
}

export async function getScanUsage(userId: string) {
  const limits = await getSeoFreeLimits();
  const agentId = await getSeoAgentId();
  const period = currentPeriod();
  const usagePeriod = await getOrCreatePeriod(userId, agentId, period);
  const counter = await getCounter(usagePeriod.id, "scans");

  return {
    used: counter.count,
    limit: limits.scans_per_month,
    period,
    remaining: Math.max(0, limits.scans_per_month - counter.count),
  };
}

export async function assertCanScan(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const usage = await getScanUsage(userId);
  if (usage.used >= usage.limit) {
    return {
      ok: false,
      message: `Monthly scan limit reached (${usage.limit}/${usage.limit}). Resets on the 1st of next month (UTC).`,
    };
  }
  return { ok: true };
}

export async function incrementScanCount(userId: string): Promise<void> {
  const agentId = await getSeoAgentId();
  const period = currentPeriod();
  const usagePeriod = await getOrCreatePeriod(userId, agentId, period);
  const counter = await getCounter(usagePeriod.id, "scans");

  await prisma.usageCounter.update({
    where: { id: counter.id },
    data: { count: counter.count + 1 },
  });
}

export async function getWebsiteUsage(userId: string) {
  const limits = await getSeoFreeLimits();
  const count = await prisma.website.count({
    where: { userId, deletedAt: null, isActive: true },
  });

  return { used: count, limit: limits.websites_max, remaining: Math.max(0, limits.websites_max - count) };
}

export async function assertCanAddWebsite(
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const usage = await getWebsiteUsage(userId);
  if (usage.used >= usage.limit) {
    return {
      ok: false,
      message: `Website limit reached (${usage.limit} on free tier). Remove a site to add another.`,
    };
  }
  return { ok: true };
}
