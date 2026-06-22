/**
 * Canonical key for deduplicating stores within a run and across fetches.
 * Uses hostname + normalized path (myshopify stores keyed by hostname).
 */
export function normalizeShopUrl(raw: string): string | null {
  try {
    const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host.includes("google.") || host.includes("facebook.")) return null;

    // Drop query/hash; keep path only for non-root myshopify (usually just hostname matters)
    const path = url.pathname.replace(/\/+$/, "") || "";
    if (host.endsWith(".myshopify.com")) {
      return `https://${host}`;
    }
    return `https://${host}${path === "" || path === "/" ? "" : path}`;
  } catch {
    return null;
  }
}

export function getShopHostname(shopUrl: string): string | null {
  try {
    const url = new URL(shopUrl.startsWith("http") ? shopUrl : `https://${shopUrl}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isLikelyShopifyStore(url: string): boolean {
  const host = getShopHostname(url);
  if (!host) return false;
  return host.endsWith(".myshopify.com") || !host.includes("etsy.com");
}
