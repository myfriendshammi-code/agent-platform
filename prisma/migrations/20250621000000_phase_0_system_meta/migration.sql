-- CreateTable
CREATE TABLE "system_meta" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_meta_key_key" ON "system_meta"("key");

-- Seed Phase 0 version marker
INSERT INTO "system_meta" ("id", "key", "value", "created_at", "updated_at")
VALUES (
    gen_random_uuid(),
    'schema_version',
    'phase_0',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
