-- AlterTable
ALTER TABLE "video_asset" ADD COLUMN     "hash" VARCHAR(64);

-- CreateIndex
CREATE INDEX "video_asset_hash_idx" ON "video_asset"("hash");
