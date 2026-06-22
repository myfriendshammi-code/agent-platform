import { prisma } from "@/lib/db";
import { findEmailOnShop } from "@/lib/lead-finder/contact-email";
import {
  DEFAULT_DISCOVER_TARGET,
  MAX_URLS_TRIED,
} from "@/lib/lead-finder/constants";
import { searchShopifyStores } from "@/lib/lead-finder/serper";
import { normalizeShopUrl } from "@/lib/lead-finder/normalize-url";
import { MAX_LEADS } from "@/lib/pod-outreach/admin-guard";
import { generateOutreachEmail } from "@/lib/pod-outreach/generate-email";

export type DiscoverProgress = {
  phase: "searching" | "extracting" | "done" | "failed";
  urlsTried: number;
  urlsQueued: number;
  leadsSaved: number;
  target: number;
  duplicatesSkipped: number;
  noEmailSkipped: number;
  message?: string;
};

export type DiscoverResult = {
  leadsSaved: number;
  urlsTried: number;
  duplicatesSkipped: number;
  noEmailSkipped: number;
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
    throw new Error(`Lead limit reached (${MAX_LEADS}). Delete leads before discovering more.`);
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

  const report = async (phase: DiscoverProgress["phase"], message?: string) => {
    await onProgress?.({
      phase,
      urlsTried,
      urlsQueued: seenUrls.size,
      leadsSaved,
      target: effectiveTarget,
      duplicatesSkipped,
      noEmailSkipped,
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

    const found = await findEmailOnShop(normalized);
    if (!found) {
      noEmailSkipped++;
      continue;
    }

    const email = found.email.toLowerCase();
    if (seenEmails.has(email)) {
      duplicatesSkipped++;
      continue;
    }

    const emailContent = generateOutreachEmail({
      name: null,
      shopName: found.shopName ?? shop.title,
      shopUrl: normalized,
      niche: shop.niche,
    });

    try {
      await prisma.podLead.create({
        data: {
          userId,
          email,
          shopName: found.shopName ?? shop.title,
          shopUrl: normalized,
          niche: shop.niche,
          notes: "lead-finder:auto",
          subject: emailContent.subject,
          bodyHtml: emailContent.bodyHtml,
          bodyText: emailContent.bodyText,
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

  await report("done", `Saved ${leadsSaved} outreach-ready leads.`);

  return {
    leadsSaved,
    urlsTried,
    duplicatesSkipped,
    noEmailSkipped,
    target: effectiveTarget,
  };
}
