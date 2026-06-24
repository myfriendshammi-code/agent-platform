import { PrismaClient } from "@prisma/client";
import { leadsToCsv, leadfinderExportFilename } from "@/lib/lead-finder/export-csv";
import { classifyMerchantLead } from "@/lib/lead-finder/classify-lead";

const prisma = new PrismaClient();

async function main() {
  const results: string[] = [];

  const count = await prisma.podLead.count();
  results.push(`existing_leads_count=${count}`);
  if (count < 6) {
    throw new Error(`Expected at least 6 existing leads, got ${count}`);
  }

  const withSource = await prisma.podLead.count({
    where: { emailSourceUrl: { not: null } },
  });
  results.push(`leads_with_email_source_url=${withSource}`);
  if (withSource < 6) {
    throw new Error(`Expected 6 leads with email_source_url, got ${withSource}`);
  }

  const leads = await prisma.podLead.findMany({ orderBy: { createdAt: "asc" } });
  const csv = leadsToCsv(leads);
  const filename = leadfinderExportFilename();
  const header = csv.split("\r\n")[0];
  const expectedHeader =
    "discovered_date,niche,shop_name,shop_url,email,email_source_url,lead_type,confidence_score,notes";
  if (header !== expectedHeader) {
    throw new Error(`CSV header mismatch: ${header}`);
  }
  if (!filename.match(/^leadfinder-\d{4}-\d{2}-\d{2}\.csv$/)) {
    throw new Error(`Bad filename: ${filename}`);
  }
  results.push(`csv_export_ok=true rows=${leads.length} filename=${filename}`);

  const dupEmail = leads[0]?.email;
  if (!dupEmail) throw new Error("No lead for dup test");
  let dupBlocked = false;
  try {
    await prisma.podLead.create({
      data: {
        userId: leads[0].userId,
        email: dupEmail,
        shopUrl: "https://example.myshopify.com",
        notes: "dup-test",
      },
    });
  } catch {
    dupBlocked = true;
  }
  if (!dupBlocked) throw new Error("Duplicate email was not blocked");
  results.push("duplicate_prevention_ok=true");

  const customily = leads.find((l) => l.email.includes("customily"));
  if (customily) {
    const cls = classifyMerchantLead({
      email: customily.email,
      shopUrl: customily.shopUrl ?? "",
      shopName: customily.shopName,
      emailSource: "mailto",
      niche: customily.niche,
    });
    if (cls.leadType !== "App company") {
      throw new Error(`Customily should classify as App company, got ${cls.leadType}`);
    }
    results.push("vendor_app_classification_ok=true");
  }

  if (process.env.SERPER_API_KEY?.trim()) {
    const { runLeadDiscover } = await import("@/lib/lead-finder/run-discover");
    const admin = await prisma.user.findFirst({ where: { role: "super_admin" } });
    if (!admin) throw new Error("No admin user for discover test");
    const beforeDiscover = await prisma.podLead.count();
    const discoverResult = await runLeadDiscover(
      admin.id,
      ["handmade ceramic dog bowl gift"],
      1,
    );
    const afterDiscover = await prisma.podLead.count();
    const delta = afterDiscover - beforeDiscover;
    if (delta > 1) throw new Error(`Unexpected lead delta: ${delta}`);
    if (discoverResult.leadsSaved === 0 && discoverResult.duplicatesSkipped === 0 && discoverResult.urlsTried === 0) {
      throw new Error("Discover run did not process any URLs");
    }
    results.push(
      `discover_run_ok=true urlsTried=${discoverResult.urlsTried} saved=${discoverResult.leadsSaved} dupes=${discoverResult.duplicatesSkipped} vendors=${discoverResult.vendorSkipped}`,
    );
  } else {
    results.push("discover_run_ok=skipped_no_serper_key");
  }

  console.log("VERIFICATION PASSED");
  for (const line of results) console.log(line);
}

main()
  .catch((e) => {
    console.error("VERIFICATION FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
