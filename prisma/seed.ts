import { AgentStatus, PlanTier, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const AGENTS = [
  {
    slug: "seo",
    name: "SEO Agent",
    description: "Sitemap, robots.txt, schema, broken links, and SEO reports.",
    status: AgentStatus.coming_soon,
    sortOrder: 1,
    iconKey: "search",
    freeLimits: {
      websites_max: 3,
      scans_per_month: 10,
      pages_per_scan: 100,
      scheduled_scans: false,
    },
  },
  {
    slug: "lead-finder",
    name: "Lead Finder Agent",
    description: "Discover businesses and collect contact leads.",
    status: AgentStatus.coming_soon,
    sortOrder: 2,
    iconKey: "users",
    freeLimits: {},
  },
  {
    slug: "outreach",
    name: "Outreach Agent",
    description: "Email generation and campaign tracking.",
    status: AgentStatus.coming_soon,
    sortOrder: 3,
    iconKey: "mail",
    freeLimits: {},
  },
  {
    slug: "mockup",
    name: "Mockup Agent",
    description: "Mockup generation and asset organization.",
    status: AgentStatus.coming_soon,
    sortOrder: 4,
    iconKey: "image",
    freeLimits: {},
  },
] as const;

async function seedAgents() {
  for (const agent of AGENTS) {
    const record = await prisma.agent.upsert({
      where: { slug: agent.slug },
      create: {
        slug: agent.slug,
        name: agent.name,
        description: agent.description,
        status: agent.status,
        sortOrder: agent.sortOrder,
        iconKey: agent.iconKey,
      },
      update: {
        name: agent.name,
        description: agent.description,
        status: agent.status,
        sortOrder: agent.sortOrder,
        iconKey: agent.iconKey,
      },
    });

    await prisma.agentPlan.upsert({
      where: {
        agentId_tier: { agentId: record.id, tier: PlanTier.free },
      },
      create: {
        agentId: record.id,
        tier: PlanTier.free,
        name: `${agent.name} Free`,
        priceCents: 0,
        limits: agent.freeLimits,
      },
      update: {
        name: `${agent.name} Free`,
        limits: agent.freeLimits,
      },
    });
  }
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.info("[seed] Skipping admin user — set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      name: "Platform Admin",
      passwordHash,
      emailVerified: new Date(),
      role: UserRole.super_admin,
    },
    update: {
      passwordHash,
      emailVerified: new Date(),
      role: UserRole.super_admin,
    },
  });

  console.info(`[seed] Super admin ready: ${email}`);
}

async function main() {
  await seedAgents();
  await seedAdmin();

  await prisma.systemMeta.upsert({
    where: { key: "schema_version" },
    create: { key: "schema_version", value: "phase_1" },
    update: { value: "phase_1" },
  });

  console.info("[seed] Phase 1 seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
