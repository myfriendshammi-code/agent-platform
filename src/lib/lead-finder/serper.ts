import { SEARCH_RESULTS_PER_QUERY } from "@/lib/lead-finder/constants";
import { normalizeShopUrl } from "@/lib/lead-finder/normalize-url";

export type ShopSearchResult = {
  url: string;
  title: string;
  niche: string;
};

type SerperResponse = {
  organic?: Array<{ link?: string; title?: string }>;
  message?: string;
};

function getSerperApiKey(): string | null {
  const key = process.env.SERPER_API_KEY?.trim();
  return key || null;
}

export function isSerperConfigured(): boolean {
  return getSerperApiKey() !== null;
}

export async function searchShopifyStores(
  niche: string,
  seenUrls: Set<string>,
): Promise<ShopSearchResult[]> {
  const apiKey = getSerperApiKey();
  if (!apiKey) {
    throw new Error("Serper not configured. Set SERPER_API_KEY in .env");
  }

  const queries = [
    `${niche.trim()} site:myshopify.com`,
    `${niche.trim()} "powered by Shopify" print on demand`,
  ];

  const results: ShopSearchResult[] = [];

  for (const query of queries) {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: SEARCH_RESULTS_PER_QUERY,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Serper error (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as SerperResponse;
    if (data.message) {
      throw new Error(`Serper: ${data.message}`);
    }

    for (const item of data.organic ?? []) {
      if (!item.link) continue;
      const normalized = normalizeShopUrl(item.link);
      if (!normalized || seenUrls.has(normalized)) continue;
      if (!normalized.includes(".myshopify.com")) continue;
      seenUrls.add(normalized);
      results.push({
        url: normalized,
        title: item.title?.replace(/\s*[-|].*$/, "").trim() || normalized,
        niche: niche.trim(),
      });
    }
  }

  return results;
}
