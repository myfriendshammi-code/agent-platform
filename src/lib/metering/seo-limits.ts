import { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/db";

export type SeoFreeLimits = {
  websites_max: number;
  scans_per_month: number;
  pages_per_scan: number;
  scheduled_scans: boolean;
};

const DEFAULT_LIMITS: SeoFreeLimits = {
  websites_max: 3,
  scans_per_month: 10,
  pages_per_scan: 100,
  scheduled_scans: false,
};

export async function getSeoFreeLimits(): Promise<SeoFreeLimits> {
  const plan = await prisma.agentPlan.findFirst({
    where: { agent: { slug: "seo" }, tier: PlanTier.free, isActive: true },
  });

  if (!plan?.limits || typeof plan.limits !== "object") {
    return DEFAULT_LIMITS;
  }

  const limits = plan.limits as Partial<SeoFreeLimits>;
  return {
    websites_max: limits.websites_max ?? DEFAULT_LIMITS.websites_max,
    scans_per_month: limits.scans_per_month ?? DEFAULT_LIMITS.scans_per_month,
    pages_per_scan: limits.pages_per_scan ?? DEFAULT_LIMITS.pages_per_scan,
    scheduled_scans: limits.scheduled_scans ?? DEFAULT_LIMITS.scheduled_scans,
  };
}

export function currentPeriod(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
