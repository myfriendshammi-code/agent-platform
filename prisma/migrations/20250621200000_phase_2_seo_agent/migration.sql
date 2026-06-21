-- Phase 2: SEO Agent tables + usage metering

CREATE TYPE "SeoScanStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'canceled');
CREATE TYPE "SeoScanType" AS ENUM ('full', 'sitemap', 'robots', 'schema', 'links', 'index');
CREATE TYPE "SeoIssueCategory" AS ENUM ('sitemap', 'robots', 'schema', 'broken_link', 'indexing', 'other');
CREATE TYPE "SeoIssueSeverity" AS ENUM ('critical', 'warning', 'info');

CREATE TABLE "usage_periods" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "period" CHAR(7) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usage_periods_user_id_agent_id_period_key" ON "usage_periods"("user_id", "agent_id", "period");
ALTER TABLE "usage_periods" ADD CONSTRAINT "usage_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_periods" ADD CONSTRAINT "usage_periods_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "usage_counters" (
    "id" UUID NOT NULL,
    "usage_period_id" UUID NOT NULL,
    "metric" VARCHAR(50) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usage_counters_usage_period_id_metric_key" ON "usage_counters"("usage_period_id", "metric");
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_usage_period_id_fkey" FOREIGN KEY ("usage_period_id") REFERENCES "usage_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "seo_scans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "status" "SeoScanStatus" NOT NULL DEFAULT 'queued',
    "scan_type" "SeoScanType" NOT NULL DEFAULT 'full',
    "pages_limit" INTEGER NOT NULL,
    "pages_crawled" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seo_scans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "seo_scans_website_id_created_at_idx" ON "seo_scans"("website_id", "created_at" DESC);
CREATE INDEX "seo_scans_user_id_status_idx" ON "seo_scans"("user_id", "status");
ALTER TABLE "seo_scans" ADD CONSTRAINT "seo_scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seo_scans" ADD CONSTRAINT "seo_scans_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "seo_scan_pages" (
    "id" UUID NOT NULL,
    "scan_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "status_code" INTEGER,
    "crawled_at" TIMESTAMPTZ(6),
    "meta_robots" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seo_scan_pages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "seo_scan_pages_scan_id_idx" ON "seo_scan_pages"("scan_id");
ALTER TABLE "seo_scan_pages" ADD CONSTRAINT "seo_scan_pages_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "seo_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "seo_issues" (
    "id" UUID NOT NULL,
    "scan_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "page_url" TEXT,
    "category" "SeoIssueCategory" NOT NULL,
    "severity" "SeoIssueSeverity" NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "fix_instruction" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seo_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "seo_issues_scan_id_category_idx" ON "seo_issues"("scan_id", "category");
CREATE INDEX "seo_issues_website_id_created_at_idx" ON "seo_issues"("website_id", "created_at" DESC);
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "seo_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "seo_reports" (
    "id" UUID NOT NULL,
    "scan_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "storage_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seo_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seo_reports_scan_id_key" ON "seo_reports"("scan_id");
ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "seo_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "agents" SET "status" = 'active', "updated_at" = CURRENT_TIMESTAMP WHERE "slug" = 'seo';
UPDATE "system_meta" SET "value" = 'phase_2', "updated_at" = CURRENT_TIMESTAMP WHERE "key" = 'schema_version';
