import {
  BLOCKED_EMAIL_DOMAINS,
  BLOCKED_LOCAL_PARTS,
  PREFERRED_LOCAL_PARTS,
} from "@/lib/lead-finder/constants";
import { getShopHostname } from "@/lib/lead-finder/normalize-url";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export type EmailCandidate = {
  email: string;
  source: "mailto" | "text";
};

export function extractEmailCandidates(html: string): EmailCandidate[] {
  const candidates: EmailCandidate[] = [];
  const seen = new Set<string>();

  const mailtoRegex = /href=["']mailto:([^"'?]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = mailtoRegex.exec(html)) !== null) {
    const raw = decodeURIComponent(match[1].trim()).split(",")[0]?.trim();
    if (!raw) continue;
    const normalized = raw.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    candidates.push({ email: raw, source: "mailto" });
  }

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  const textMatches = stripped.match(EMAIL_REGEX) ?? [];
  for (const raw of textMatches) {
    const normalized = raw.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    candidates.push({ email: raw, source: "text" });
  }

  return candidates;
}

function isBlockedEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (lower.includes("example") && lower.includes("@")) return true;
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(lower)) return true;

  const [local, domain] = lower.split("@");
  if (!local || !domain) return true;
  if (BLOCKED_LOCAL_PARTS.has(local)) return true;
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return true;

  for (const blocked of BLOCKED_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }

  return false;
}

function domainMatchesShop(emailDomain: string, shopHostname: string): boolean {
  if (emailDomain === shopHostname) return true;
  if (shopHostname.endsWith(".myshopify.com")) {
    // Custom domain may differ; mailto on their page is trusted separately
    return false;
  }
  if (emailDomain.endsWith(`.${shopHostname}`)) return true;
  if (shopHostname.endsWith(emailDomain)) return true;
  return false;
}

function scoreEmail(candidate: EmailCandidate, shopHostname: string): number {
  const lower = candidate.email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!local || !domain) return -1;

  let score = 0;
  if (candidate.source === "mailto") score += 50;
  if (domainMatchesShop(domain, shopHostname)) score += 40;
  if (PREFERRED_LOCAL_PARTS.includes(local as (typeof PREFERRED_LOCAL_PARTS)[number])) {
    score += 20 - PREFERRED_LOCAL_PARTS.indexOf(local as (typeof PREFERRED_LOCAL_PARTS)[number]);
  }
  // Deprioritize generic text extractions on myshopify unless mailto
  if (shopHostname.endsWith(".myshopify.com") && candidate.source === "text" && !domainMatchesShop(domain, shopHostname)) {
    score -= 30;
  }
  return score;
}

/**
 * Pick the best merchant email for a shop, or null if none pass filters.
 * Contact-form-only pages with no extractable email return null.
 */
export function selectShopEmail(
  candidates: EmailCandidate[],
  shopUrl: string,
): string | null {
  const shopHostname = getShopHostname(shopUrl);
  if (!shopHostname) return null;

  const valid = candidates
    .filter((c) => !isBlockedEmail(c.email))
    .map((c) => ({ ...c, score: scoreEmail(c, shopHostname) }))
    .filter((c) => c.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (valid.length === 0) return null;

  const best = valid[0];
  // Require mailto OR domain match for myshopify hosts (blocks widget noise in page HTML)
  if (shopHostname.endsWith(".myshopify.com")) {
    const domain = best.email.split("@")[1]?.toLowerCase();
    if (best.source !== "mailto" && domain && !domainMatchesShop(domain, shopHostname)) {
      const mailtoMatch = valid.find((v) => v.source === "mailto");
      if (!mailtoMatch) return null;
      return mailtoMatch.email.toLowerCase();
    }
  }

  // Minimum bar: mailto on page, or domain-aligned business address
  if (best.source === "mailto") return best.email.toLowerCase();
  const domain = best.email.split("@")[1]?.toLowerCase();
  if (domain && domainMatchesShop(domain, shopHostname)) return best.email.toLowerCase();

  return null;
}

export { isBlockedEmail };
