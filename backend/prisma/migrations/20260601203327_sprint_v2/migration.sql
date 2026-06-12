-- CreateEnum
CREATE TYPE "SprintEvent" AS ENUM ('S100M', 'S200M', 'S400M', 'RELAY', 'PRACTICE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PredictionKind" ADD VALUE 'SPRINT_PHASE';
ALTER TYPE "PredictionKind" ADD VALUE 'TECHNIQUE_ERROR';
ALTER TYPE "PredictionKind" ADD VALUE 'PERFORMANCE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'ATHLETE';
ALTER TYPE "Role" ADD VALUE 'COACH';
ALTER TYPE "Role" ADD VALUE 'RESEARCHER';

-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "athlete_id" UUID,
ADD COLUMN     "event" "SprintEvent" NOT NULL DEFAULT 'PRACTICE';

-- CreateTable
CREATE TABLE "athlete" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "coach_id" UUID,
    "full_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "sex" TEXT,
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "country" TEXT,
    "primary_event" "SprintEvent" NOT NULL DEFAULT 'S100M',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "athlete_user_id_key" ON "athlete"("user_id");

-- CreateIndex
CREATE INDEX "athlete_coach_id_idx" ON "athlete"("coach_id");

-- CreateIndex
CREATE INDEX "athlete_country_idx" ON "athlete"("country");

-- CreateIndex
CREATE INDEX "session_athlete_id_started_at_idx" ON "session"("athlete_id", "started_at" DESC);

-- AddForeignKey
ALTER TABLE "athlete" ADD CONSTRAINT "athlete_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete" ADD CONSTRAINT "athlete_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;
