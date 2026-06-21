import { randomBytes } from "crypto";
import * as cheerio from "cheerio";
import { fetchUrl } from "@/lib/seo/fetch";
import { siteOrigin } from "@/lib/seo/domain";

export function generateVerificationToken(): string {
  return randomBytes(16).toString("hex");
}

export function metaTagSnippet(token: string): string {
  return `<meta name="agentplatform-verify" content="${token}" />`;
}

export async function verifyMetaTag(domain: string, token: string): Promise<boolean> {
  const origin = siteOrigin(domain);
  const { body } = await fetchUrl(origin);

  const $ = cheerio.load(body);
  const metaContent = $('meta[name="agentplatform-verify"]').attr("content");
  if (metaContent === token) return true;

  return body.includes(`content="${token}"`) && body.includes('name="agentplatform-verify"');
}
