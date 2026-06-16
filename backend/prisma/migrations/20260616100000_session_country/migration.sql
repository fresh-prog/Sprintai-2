-- AlterTable
ALTER TABLE "session" ADD COLUMN     "country" TEXT;

-- CreateIndex
CREATE INDEX "session_country_idx" ON "session"("country");
