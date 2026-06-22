/**
 * End-to-end Lead Finder verification (Serper → contact email → pod_leads).
 * Usage: npx tsx scripts/verify-lead-finder.ts [userId]
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { findEmailOnShop } from "../src/lib/lead-finder/contact-email";
import { searchShopifyStores } from "../src/lib/lead-finder/serper";
import { generateOutreachEmail } from "../src/lib/pod-outreach/generate-email";

async function main() {
  if (!process.env.SERPER_API_KEY?.trim()) {
    console.error("FAIL: SERPER_API_KEY not set in .env");
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({
    where: { role: { in: ["admin", "super_admin"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    console.error("FAIL: No admin user in database. Run npm run db:seed");
    process.exit(1);
  }

  const userId = process.argv[2] ?? admin.id;
  const niche = "dog mom mug";
  const seenUrls = new Set<string>();

  console.log("Step 1: Serper store discovery…");
  const stores = await searchShopifyStores(niche, seenUrls);
  if (stores.length === 0) {
    console.error("FAIL: No store URLs discovered");
    process.exit(1);
  }
  console.log(`OK: ${stores.length} store URL(s) discovered`);
  console.log(`  Example: ${stores[0].url}`);

  console.log("Step 2: Contact-page email extraction…");
  let saved: {
    email: string;
    shopUrl: string;
    shopName: string;
    subject: string;
  } | null = null;

  for (const shop of stores) {
    const found = await findEmailOnShop(shop.url);
    if (!found) continue;
    console.log(`OK: Email extracted: ${found.email} from ${shop.url}`);
    saved = {
      email: found.email,
      shopUrl: shop.url,
      shopName: found.shopName ?? shop.title,
      subject: "",
    };
    break;
  }

  if (!saved) {
    console.error("FAIL: No email extracted from discovered stores (try more URLs in a full run)");
    process.exit(1);
  }

  const emailContent = generateOutreachEmail({
    name: null,
    shopName: saved.shopName,
    shopUrl: saved.shopUrl,
    niche,
  });
  saved.subject = emailContent.subject;

  console.log("Step 3: Save lead to pod_leads with draft outreach…");
  const testEmail = saved.email;
  await prisma.podLead.deleteMany({ where: { userId, email: testEmail } }).catch(() => {});

  const lead = await prisma.podLead.create({
    data: {
      userId,
      email: testEmail,
      shopName: saved.shopName,
      shopUrl: saved.shopUrl,
      niche,
      notes: "lead-finder:verify",
      subject: emailContent.subject,
      bodyHtml: emailContent.bodyHtml,
      bodyText: emailContent.bodyText,
    },
  });

  console.log("OK: Lead saved to pod_leads");
  console.log(`  id: ${lead.id}`);
  console.log(`  email: ${lead.email}`);
  console.log(`  subject: ${lead.subject}`);

  console.log("\n=== E2E VERIFICATION PASSED ===");
  console.log("1. Store URL discovered: yes");
  console.log("2. Email extracted: yes");
  console.log("3. Lead saved to pod_leads: yes");
  console.log("4. Outreach draft generated: yes");
}

main()
  .catch((err) => {
    console.error("FAIL:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
