/**
 * End-to-end Lead Finder verification (Serper → vendor filter → email → pod_leads).
 * Usage: npx tsx scripts/verify-lead-finder.ts [userId]
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { runLeadDiscover } from "../src/lib/lead-finder/run-discover";

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
  const niches = ["dog mom mug", "funny dog shirt", "pet lover gift", "custom dog mug"];
  const target = 5;
  const runStartedAt = new Date();

  console.log(`Running discover for niches: ${niches.join(", ")} (target ${target})…\n`);
  const result = await runLeadDiscover(userId, niches, target);

  console.log("1. URLs discovered:", result.urlsDiscovered);
  console.log("2. vendorSkipped:", result.vendorSkipped);
  if (result.vendorReason) {
    console.log("   vendorReason (last):", result.vendorReason);
  }
  console.log("3. emails extracted:", result.emailsExtracted);
  console.log("4. leads saved:", result.leadsSaved);
  console.log(`   (urlsTried: ${result.urlsTried}, noEmailSkipped: ${result.noEmailSkipped})`);

  const savedLeads = await prisma.podLead.findMany({
    where: {
      userId,
      notes: "lead-finder:auto",
      createdAt: { gte: runStartedAt },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: { shopName: true, email: true, shopUrl: true },
  });

  console.log("\n5. First saved leads:");
  if (savedLeads.length === 0) {
    console.error("FAIL: No merchant leads saved in this run");
    process.exit(1);
  }
  for (const lead of savedLeads) {
    console.log(`   - ${lead.shopName ?? "(no name)"} | ${lead.email} | ${lead.shopUrl}`);
  }

  const vendorLead = savedLeads.find((l) => l.email.includes("customily.com"));
  if (vendorLead) {
    console.error("\nFAIL: Saved lead looks like a Shopify app vendor:", vendorLead.email);
    process.exit(1);
  }

  console.log("\n=== VERIFICATION PASSED ===");
}

main()
  .catch((err) => {
    console.error("FAIL:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
