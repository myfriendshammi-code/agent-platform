import {
  Prisma,
  SeoIssueCategory,
  SeoIssueSeverity,
  SeoScanStatus,
} from "@prisma/client";
import * as cheerio from "cheerio";
import { recordAgentActivation } from "@/lib/agents/activation";
import { siteOrigin } from "@/lib/seo/domain";
import { fetchUrl } from "@/lib/seo/fetch";
import { prisma } from "@/lib/db";

type IssueInput = {
  pageUrl?: string;
  category: SeoIssueCategory;
  severity: SeoIssueSeverity;
  code: string;
  message: string;
  fixInstruction: string;
  metadata?: Prisma.InputJsonValue;
};

function parseRobotsDisallow(robotsBody: string): string[] {
  const lines = robotsBody.split("\n");
  const rules: string[] = [];
  let applies = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split(":");
    if (!key || !rest.length) continue;
    const value = rest.join(":").trim();
    if (key.toLowerCase() === "user-agent") {
      applies = value === "*" || value.toLowerCase().includes("agentplatform");
    }
    if (applies && key.toLowerCase() === "disallow" && value) {
      rules.push(value);
    }
  }
  return rules;
}

function isDisallowed(path: string, rules: string[]): boolean {
  return rules.some((rule) => rule !== "/" && path.startsWith(rule));
}

function extractLinks(html: string, baseUrl: string, host: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }
    try {
      const absolute = new URL(href, baseUrl);
      if (absolute.hostname.replace(/^www\./, "") === host.replace(/^www\./, "")) {
        absolute.hash = "";
        links.add(absolute.toString());
      }
    } catch {
      // ignore invalid URLs
    }
  });

  return [...links];
}

function extractMetaRobots(html: string): string | null {
  const $ = cheerio.load(html);
  return $("meta[name='robots']").attr("content") ?? $("meta[name='ROBOTS']").attr("content") ?? null;
}

function hasJsonLdSchema(html: string): boolean {
  const $ = cheerio.load(html);
  let found = false;
  $("script[type='application/ld+json']").each((_, el) => {
    const text = $(el).html()?.trim();
    if (text) found = true;
  });
  return found;
}

export async function runSeoScan(scanId: string): Promise<void> {
  const scan = await prisma.seoScan.findUnique({
    where: { id: scanId },
    include: { website: true },
  });

  if (!scan || scan.status === SeoScanStatus.canceled) return;

  const domain = scan.website.domain;
  const origin = siteOrigin(domain);
  const host = domain.replace(/^www\./, "");
  const issues: IssueInput[] = [];

  await prisma.seoScan.update({
    where: { id: scanId },
    data: { status: SeoScanStatus.running, startedAt: new Date(), errorMessage: null },
  });

  try {
    // --- Robots.txt ---
    const robotsUrl = `${origin}/robots.txt`;
    const robotsRes = await fetchUrl(robotsUrl);
    let disallowRules: string[] = [];

    if (robotsRes.status === 404) {
      issues.push({
        category: SeoIssueCategory.robots,
        severity: SeoIssueSeverity.warning,
        code: "robots_missing",
        message: "robots.txt not found",
        fixInstruction:
          "Create a /robots.txt file at your site root. At minimum add: User-agent: * and Allow: / (or specific rules for crawlers).",
      });
    } else if (!robotsRes.ok) {
      issues.push({
        category: SeoIssueCategory.robots,
        severity: SeoIssueSeverity.warning,
        code: "robots_error",
        message: `robots.txt returned HTTP ${robotsRes.status}`,
        fixInstruction: "Ensure /robots.txt is publicly accessible and returns HTTP 200.",
      });
    } else {
      disallowRules = parseRobotsDisallow(robotsRes.body);
      if (disallowRules.includes("/")) {
        issues.push({
          category: SeoIssueCategory.robots,
          severity: SeoIssueSeverity.critical,
          code: "robots_blocks_all",
          message: "robots.txt disallows all crawlers (Disallow: /)",
          fixInstruction:
            "Remove or narrow Disallow: / in robots.txt unless you intentionally want the site hidden from search engines.",
        });
      }
    }

    // --- Sitemap ---
    const sitemapUrl = `${origin}/sitemap.xml`;
    const sitemapRes = await fetchUrl(sitemapUrl);
    if (sitemapRes.status === 404) {
      issues.push({
        category: SeoIssueCategory.sitemap,
        severity: SeoIssueSeverity.warning,
        code: "sitemap_missing",
        message: "sitemap.xml not found",
        fixInstruction:
          "Add a sitemap.xml at your site root listing important URLs, then reference it in robots.txt: Sitemap: https://yourdomain.com/sitemap.xml",
      });
    } else if (!sitemapRes.ok) {
      issues.push({
        category: SeoIssueCategory.sitemap,
        severity: SeoIssueSeverity.warning,
        code: "sitemap_error",
        message: `sitemap.xml returned HTTP ${sitemapRes.status}`,
        fixInstruction: "Ensure /sitemap.xml is valid XML and returns HTTP 200.",
      });
    } else {
      const urlCount = (sitemapRes.body.match(/<loc>/gi) ?? []).length;
      if (urlCount === 0) {
        issues.push({
          category: SeoIssueCategory.sitemap,
          severity: SeoIssueSeverity.warning,
          code: "sitemap_empty",
          message: "sitemap.xml contains no <loc> entries",
          fixInstruction: "Add <url><loc>https://example.com/page</loc></url> entries for each indexable page.",
        });
      }
    }

    // --- Crawl ---
    const queue: string[] = [origin];
    const visited = new Set<string>();
    let pagesCrawled = 0;

    while (queue.length > 0 && pagesCrawled < scan.pagesLimit) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      const path = new URL(url).pathname;
      if (isDisallowed(path, disallowRules)) continue;

      const pageRes = await fetchUrl(url);
      pagesCrawled++;

      const metaRobots = pageRes.ok ? extractMetaRobots(pageRes.body) : null;

      await prisma.seoScanPage.create({
        data: {
          scanId,
          url,
          statusCode: pageRes.status,
          crawledAt: new Date(),
          metaRobots,
        },
      });

      if (!pageRes.ok) {
        issues.push({
          pageUrl: url,
          category: SeoIssueCategory.broken_link,
          severity: SeoIssueSeverity.critical,
          code: "page_http_error",
          message: `Page returned HTTP ${pageRes.status}`,
          fixInstruction: `Fix the server response for ${url}. Aim for HTTP 200 on indexable pages.`,
          metadata: { status: pageRes.status },
        });
        continue;
      }

      if (metaRobots?.toLowerCase().includes("noindex")) {
        issues.push({
          pageUrl: url,
          category: SeoIssueCategory.indexing,
          severity: SeoIssueSeverity.warning,
          code: "noindex",
          message: "Page has noindex directive",
          fixInstruction:
            "Remove noindex from meta robots or X-Robots-Tag if this page should appear in search results.",
          metadata: { metaRobots },
        });
      }

      if (pagesCrawled === 1) {
        if (!hasJsonLdSchema(pageRes.body)) {
          issues.push({
            pageUrl: url,
            category: SeoIssueCategory.schema,
            severity: SeoIssueSeverity.warning,
            code: "schema_missing",
            message: "No JSON-LD structured data found on homepage",
            fixInstruction:
              'Add a <script type="application/ld+json"> block with Organization or WebSite schema on your homepage.',
          });
        }
      }

      const links = extractLinks(pageRes.body, url, host);
      for (const link of links) {
        if (!visited.has(link) && queue.length + pagesCrawled < scan.pagesLimit) {
          queue.push(link);
        }
      }

      for (const link of links.slice(0, 20)) {
        if (link === url) continue;
        const head = await fetchUrl(link, { method: "HEAD" }).catch(() =>
          fetchUrl(link, { method: "GET" }),
        );
        if (head.status >= 400) {
          issues.push({
            pageUrl: url,
            category: SeoIssueCategory.broken_link,
            severity: SeoIssueSeverity.critical,
            code: "broken_internal_link",
            message: `Broken internal link (${head.status}): ${link}`,
            fixInstruction: `Update or remove the broken link pointing to ${link} from ${url}.`,
            metadata: { target: link, status: head.status },
          });
        }
      }
    }

    await prisma.seoScan.update({
      where: { id: scanId },
      data: { pagesCrawled },
    });

    if (issues.length > 0) {
      await prisma.seoIssue.createMany({
        data: issues.map((issue) => ({
          scanId,
          websiteId: scan.websiteId,
          pageUrl: issue.pageUrl ?? null,
          category: issue.category,
          severity: issue.severity,
          code: issue.code,
          message: issue.message,
          fixInstruction: issue.fixInstruction,
          metadata: issue.metadata ?? Prisma.JsonNull,
        })),
      });
    }

    const summary = {
      total: issues.length,
      critical: issues.filter((i) => i.severity === SeoIssueSeverity.critical).length,
      warning: issues.filter((i) => i.severity === SeoIssueSeverity.warning).length,
      info: issues.filter((i) => i.severity === SeoIssueSeverity.info).length,
      pagesCrawled,
      byCategory: issues.reduce<Record<string, number>>((acc, issue) => {
        acc[issue.category] = (acc[issue.category] ?? 0) + 1;
        return acc;
      }, {}),
    };

    await prisma.seoReport.create({
      data: {
        scanId,
        userId: scan.userId,
        websiteId: scan.websiteId,
        summary,
      },
    });

    await prisma.seoScan.update({
      where: { id: scanId },
      data: { status: SeoScanStatus.completed, completedAt: new Date() },
    });

    await recordAgentActivation({
      userId: scan.userId,
      agentSlug: "seo",
      eventType: "seo.scan.completed",
      eventRefId: scanId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    await prisma.seoScan.update({
      where: { id: scanId },
      data: {
        status: SeoScanStatus.failed,
        completedAt: new Date(),
        errorMessage: message,
      },
    });
    throw error;
  }
}
