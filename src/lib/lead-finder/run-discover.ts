import { prisma } from "@/lib/db";
import { findEmailOnShop } from "@/lib/lead-finder/contact-email";
import {
  DEFAULT_DISCOVER_TARGET,
  MAX_URLS_TRIED,
} from "@/lib/lead-finder/constants";
import { searchShopifyStores } from "@/lib/lead-finder/serper";
import { normalizeShopUrl } from "@/lib/lead-finder/normalize-url";
import { fetchShopHomepage, getVendorSkipReason } from "@/lib/lead-finder/vendor-filter";
import { MAX_LEADS } from "@/lib/lead-finder/admin-guard";
import { classifyMerchantLead } from "@/lib/lead-finder/classify-lead";

export type DiscoverProgress = {
  phase: "searching" | "extracting" | "done" | "failed";
  urlsTried: number;
  urlsQueued: number;
  leadsSaved: number;
  target: number;
  duplicatesSkipped: number;
  noEmailSkipped: number;
  vendorSkipped: number;
  vendorReason: string | null;
  message?: string;
};

export type DiscoverResult = {
  leadsSaved: number;
  urlsTried: number;
  urlsDiscovered: number;
  duplicatesSkipped: number;
  noEmailSkipped: number;
  vendorSkipped: number;
  vendorReason: string | null;
  emailsExtracted: number;
  target: number;
};

export async function runLeadDiscover(
  userId: string,
  niches: string[],
  target: number = DEFAULT_DISCOVER_TARGET,
  onProgress?: (progress: DiscoverProgress) => Promise<void>,
): Promise<DiscoverResult> {
  const trimmedNiches = niches.map((n) => n.trim()).filter(Boolean);
  if (trimmedNiches.length === 0) {
    throw new Error("Provide at least one niche keyword");
  }

  const existingCount = await prisma.podLead.count({ where: { userId } });
  const slotsRemaining = Math.max(0, MAX_LEADS - existingCount);
  if (slotsRemaining === 0) {
    throw new Error(`Lead limit reached (${MAX_LEADS}). Export or delete leads before discovering more.`);
  }

  const effectiveTarget = Math.min(target, slotsRemaining);
  const seenUrls = new Set<string>();
  const seenEmails = new Set<string>();

  const existingEmails = await prisma.podLead.findMany({
    where: { userId },
    select: { email: true },
  });
  for (const row of existingEmails) {
    seenEmails.add(row.email.toLowerCase());
  }

  let urlsTried = 0;
  let leadsSaved = 0;
  let duplicatesSkipped = 0;
  let noEmailSkipped = 0;
  let vendorSkipped = 0;
  let vendorReason: string | null = null;
  let emailsExtracted = 0;

  const report = async (phase: DiscoverProgress["phase"], message?: string) => {
    await onProgress?.({
      phase,
      urlsTried,
      urlsQueued: seenUrls.size,
      leadsSaved,
      target: effectiveTarget,
      duplicatesSkipped,
      noEmailSkipped,
      vendorSkipped,
      vendorReason,
      message,
    });
  };

  await report("searching", "Searching Serper for Shopify stores…");

  const queue: Array<{ url: string; title: string; niche: string }> = [];
  for (const niche of trimmedNiches) {
    if (queue.length >= MAX_URLS_TRIED) break;
    const found = await searchShopifyStores(niche, seenUrls);
    queue.push(...found);
  }

  await report("extracting", `Checking contact pages (${queue.length} stores)…`);

  for (const shop of queue) {
    if (leadsSaved >= effectiveTarget) break;
    if (urlsTried >= MAX_URLS_TRIED) break;

    const normalized = normalizeShopUrl(shop.url);
    if (!normalized) continue;

    urlsTried++;
    await report("extracting");

    const homepageHtml = await fetchShopHomepage(normalized);
    if (homepageHtml) {
      const skipReason = getVendorSkipReason(homepageHtml);
      if (skipReason) {
        vendorSkipped++;
        vendorReason = skipReason;
        console.info(`[lead-finder] vendorSkipped url=${normalized} vendorReason=${skipReason}`);
        await report("extracting");
        continue;
      }
    }

    const found = await findEmailOnShop(normalized);
    if (!found) {
      noEmailSkipped++;
      continue;
    }

    emailsExtracted++;
    const email = found.email.toLowerCase();
    if (seenEmails.has(email)) {
      duplicatesSkipped++;
      continue;
    }

    const shopName = found.shopName ?? shop.title;
    const { leadType, confidenceScore } = classifyMerchantLead({
      email,
      shopUrl: normalized,
      shopName,
      emailSource: found.emailSource,
      niche: shop.niche,
    });

    if (leadType === "App company") {
      vendorSkipped++;
      vendorReason = "app company";
      continue;
    }

    if (leadType === "Vendor/service provider" && confidenceScore < 50) {
      vendorSkipped++;
      vendorReason = "vendor/service provider";
      continue;
    }

    try {
      await prisma.podLead.create({
        data: {
          userId,
          email,
          shopName,
          shopUrl: normalized,
          emailSourceUrl: found.emailSourceUrl,
          leadType,
          confidenceScore,
          niche: shop.niche,
          notes: "lead-finder:auto",
        },
      });
      seenEmails.add(email);
      leadsSaved++;
      await report("extracting");
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        duplicatesSkipped++;
      } else {
        throw error;
      }
    }
  }

  await report("done", `Saved ${leadsSaved} merchant leads.`);

  return {
    leadsSaved,
    urlsTried,
    urlsDiscovered: queue.length,
    duplicatesSkipped,
    noEmailSkipped,
    vendorSkipped,
    vendorReason,
    emailsExtracted,
    target: effectiveTarget,
  };
}
