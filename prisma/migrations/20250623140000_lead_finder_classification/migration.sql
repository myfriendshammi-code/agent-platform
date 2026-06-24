-- AlterTable
ALTER TABLE "pod_leads" ADD COLUMN "lead_type" VARCHAR(64),
ADD COLUMN "confidence_score" INTEGER;
