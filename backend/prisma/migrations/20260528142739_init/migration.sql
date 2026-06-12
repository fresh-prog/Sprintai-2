-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SessionSource" AS ENUM ('WEBCAM', 'UPLOAD');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PredictionKind" AS ENUM ('POSTURE', 'ACTIVITY', 'INJURY_RISK', 'FORM');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "source" "SessionSource" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_asset" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pose_frame" (
    "id" BIGSERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "frame_idx" INTEGER NOT NULL,
    "ts_ms" INTEGER NOT NULL,
    "keypoints" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pose_frame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric" (
    "id" BIGSERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ts_ms" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction" (
    "id" BIGSERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "kind" "PredictionKind" NOT NULL,
    "ts_ms" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "prediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_expires_at_idx" ON "refresh_token"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "session_user_id_started_at_idx" ON "session"("user_id", "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "video_asset_session_id_key" ON "video_asset"("session_id");

-- CreateIndex
CREATE INDEX "pose_frame_session_id_frame_idx_idx" ON "pose_frame"("session_id", "frame_idx");

-- CreateIndex
CREATE INDEX "metric_session_id_name_ts_ms_idx" ON "metric"("session_id", "name", "ts_ms");

-- CreateIndex
CREATE INDEX "prediction_session_id_kind_ts_ms_idx" ON "prediction"("session_id", "kind", "ts_ms");

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_asset" ADD CONSTRAINT "video_asset_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pose_frame" ADD CONSTRAINT "pose_frame_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric" ADD CONSTRAINT "metric_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction" ADD CONSTRAINT "prediction_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
