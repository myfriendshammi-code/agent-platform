-- CreateEnum
CREATE TYPE "PodLeadStatus" AS ENUM ('draft', 'sent', 'replied', 'interested');

-- CreateTable
CREATE TABLE "pod_leads" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "shop_name" VARCHAR(255),
    "shop_url" TEXT,
    "niche" VARCHAR(255),
    "notes" TEXT,
    "status" "PodLeadStatus" NOT NULL DEFAULT 'draft',
    "subject" TEXT,
    "body_html" TEXT,
    "body_text" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pod_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pod_leads_user_id_status_idx" ON "pod_leads"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pod_leads_user_id_email_key" ON "pod_leads"("user_id", "email");

-- AddForeignKey
ALTER TABLE "pod_leads" ADD CONSTRAINT "pod_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
