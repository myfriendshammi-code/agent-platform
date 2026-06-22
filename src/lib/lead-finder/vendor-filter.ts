import { FETCH_TIMEOUT_MS, VENDOR_SKIP_KEYWORDS } from "@/lib/lead-finder/constants";

export async function fetchShopHomepage(shopUrl: string): Promise<string | null> {
  const base = shopUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}/`, {
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

function pageText(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1] ?? "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return `${title} ${body}`.toLowerCase();
}

/** Returns matched vendor/B2B signal, or null when the store should proceed to email extraction. */
export function getVendorSkipReason(html: string): string | null {
  if (/apps\.shopify\.com/i.test(html)) {
    return "apps.shopify.com link";
  }

  const haystack = pageText(html);
  for (const keyword of VENDOR_SKIP_KEYWORDS) {
    if (haystack.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}
