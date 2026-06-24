import { getShopHostname } from "@/lib/lead-finder/normalize-url";

const APP_EMAIL_DOMAINS = ["customily.com"];
const VENDOR_EMAIL_HINTS = ["printing", "printinc", "fulfillment", "custom.com"];
const POD_SHOP_HINTS = ["print on demand", "personalized", "custom gift", "pod"];

export type LeadClassification = {
  leadType: string;
  confidenceScore: number;
};

export function classifyMerchantLead(input: {
  email: string;
  shopUrl: string;
  shopName: string | null;
  emailSource: "mailto" | "text";
  niche?: string | null;
}): LeadClassification {
  const emailDomain = input.email.split("@")[1]?.toLowerCase() ?? "";
  const shopHost = getShopHostname(input.shopUrl) ?? "";
  const shopNameLower = input.shopName?.toLowerCase() ?? "";
  const nicheLower = input.niche?.toLowerCase() ?? "";

  let score = input.emailSource === "mailto" ? 72 : 52;

  if (shopHost && emailDomain === shopHost) score += 18;
  else if (shopHost && emailDomain.endsWith(shopHost.replace(/^www\./, ""))) score += 12;
  else if (shopHost.endsWith(".myshopify.com") && !emailDomain.includes("myshopify.com")) score += 8;

  if (APP_EMAIL_DOMAINS.some((d) => emailDomain === d || emailDomain.endsWith(`.${d}`))) {
    return { leadType: "App company", confidenceScore: Math.min(score, 15) };
  }

  if (
    shopNameLower.includes("personalizer") ||
    shopNameLower.includes("demo store") ||
    shopNameLower.includes("app store")
  ) {
    return { leadType: "App company", confidenceScore: Math.min(score, 20) };
  }

  if (
    VENDOR_EMAIL_HINTS.some((hint) => emailDomain.includes(hint)) &&
    !shopHost.includes(emailDomain.split(".")[0] ?? "")
  ) {
    return { leadType: "Vendor/service provider", confidenceScore: Math.min(score, 45) };
  }

  const podNiche =
    POD_SHOP_HINTS.some((h) => nicheLower.includes(h)) ||
    POD_SHOP_HINTS.some((h) => shopNameLower.includes(h));

  if (shopHost.endsWith(".myshopify.com") || podNiche) {
    return { leadType: "POD merchant", confidenceScore: Math.min(100, score + (podNiche ? 10 : 0)) };
  }

  if (shopHost && !shopHost.endsWith(".myshopify.com")) {
    return { leadType: "Ecommerce merchant", confidenceScore: Math.min(100, score + 5) };
  }

  return { leadType: "Unknown", confidenceScore: Math.min(100, score) };
}
