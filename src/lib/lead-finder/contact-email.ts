import {
  CONTACT_PATHS,
  FETCH_DELAY_MS,
  FETCH_TIMEOUT_MS,
} from "@/lib/lead-finder/constants";
import { extractEmailCandidates, selectShopEmail } from "@/lib/lead-finder/validate-email";

export type ShopEmailResult = {
  email: string;
  shopName: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string | null> {
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
    return await response.text();
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

/**
 * Attempt to find a merchant email on public store pages.
 * Returns null when only a contact form exists (no extractable email).
 */
export async function findEmailOnShop(shopUrl: string): Promise<ShopEmailResult | null> {
  const base = shopUrl.replace(/\/+$/, "");
  let shopName: string | null = null;
  const allCandidates = [];

  for (let i = 0; i < CONTACT_PATHS.length; i++) {
    if (i > 0) await sleep(FETCH_DELAY_MS);
    const path = CONTACT_PATHS[i];
    const pageUrl = path === "/" ? `${base}/` : `${base}${path}`;
    const html = await fetchPage(pageUrl);
    if (!html) continue;

    if (!shopName) shopName = parseTitle(html);
    allCandidates.push(...extractEmailCandidates(html));

    const email = selectShopEmail(allCandidates, shopUrl);
    if (email) {
      return { email, shopName };
    }
  }

  return null;
}
