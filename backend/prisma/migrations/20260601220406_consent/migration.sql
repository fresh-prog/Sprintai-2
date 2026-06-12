-- CreateEnum
CREATE TYPE "ConsentScope" AS ENUM ('TRAINING_DATA', 'RESEARCH_RELEASE', 'COACH_VISIBILITY', 'PUBLIC_RANKING');

-- CreateTable
CREATE TABLE "consent" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "granted_by_id" UUID NOT NULL,
    "scope" "ConsentScope" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "form_version" TEXT NOT NULL DEFAULT 'v1',
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_athlete_id_idx" ON "consent"("athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "consent_athlete_id_scope_form_version_key" ON "consent"("athlete_id", "scope", "form_version");
