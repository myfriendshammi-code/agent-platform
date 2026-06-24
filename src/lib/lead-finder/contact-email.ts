import {
  CONTACT_PATHS,
  FETCH_DELAY_MS,
  FETCH_TIMEOUT_MS,
} from "@/lib/lead-finder/constants";
import { extractEmailCandidates, selectShopEmail } from "@/lib/lead-finder/validate-email";

export type ShopEmailResult = {
  email: string;
  shopName: string | null;
  emailSourceUrl: string;
  emailSource: "mailto" | "text";
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "MockupExpoLeadFinder/1.0 (+contact-discovery; admin-only)",
      },
      redirect: "follow",
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }
    return { html: await response.text(), finalUrl: response.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim().replace(/\s*[-|].*$/, "").trim() ?? null;
}

function sourceUrlForEmail(
  email: string,
  pages: Array<{ finalUrl: string; candidates: ReturnType<typeof extractEmailCandidates> }>,
): string {
  const target = email.toLowerCase();
  for (const page of pages) {
    if (page.candidates.some((c) => c.email.toLowerCase() === target)) {
      return page.finalUrl;
    }
  }
  return pages.at(-1)?.finalUrl ?? "";
}

function sourceForEmail(
  email: string,
  pages: Array<{ finalUrl: string; candidates: ReturnType<typeof extractEmailCandidates> }>,
): "mailto" | "text" {
  const target = email.toLowerCase();
  for (const page of pages) {
    const match = page.candidates.find((c) => c.email.toLowerCase() === target);
    if (match) return match.source;
  }
  return "text";
}

/**
 * Attempt to find a merchant email on public store pages.
 * Returns null when only a contact form exists (no extractable email).
 */
export async function findEmailOnShop(shopUrl: string): Promise<ShopEmailResult | null> {
  const base = shopUrl.replace(/\/+$/, "");
  let shopName: string | null = null;
  const allCandidates = [];
  const pages: Array<{
    finalUrl: string;
    candidates: ReturnType<typeof extractEmailCandidates>;
  }> = [];

  for (let i = 0; i < CONTACT_PATHS.length; i++) {
    if (i > 0) await sleep(FETCH_DELAY_MS);
    const path = CONTACT_PATHS[i];
    const pageUrl = path === "/" ? `${base}/` : `${base}${path}`;
    const fetched = await fetchPage(pageUrl);
    if (!fetched) continue;

    const { html, finalUrl } = fetched;
    if (!shopName) shopName = parseTitle(html);
    const pageCandidates = extractEmailCandidates(html);
    pages.push({ finalUrl, candidates: pageCandidates });
    allCandidates.push(...pageCandidates);

    const email = selectShopEmail(allCandidates, shopUrl);
    if (email) {
      return {
        email,
        shopName,
        emailSourceUrl: sourceUrlForEmail(email, pages),
        emailSource: sourceForEmail(email, pages),
      };
    }
  }

  return null;
}
