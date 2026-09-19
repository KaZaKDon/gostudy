CREATE TYPE "TeacherProfileMediaType" AS ENUM (
    'PHOTO',
    'VIDEO'
);

CREATE TYPE "TeacherProfileMediaStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'REPLACED'
);

CREATE TABLE "teacher_profile_media" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "type" "TeacherProfileMediaType" NOT NULL,
    "stored_path" TEXT NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "status" "TeacherProfileMediaStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" VARCHAR(2000),
    "checked_by" INTEGER,
    "checked_at" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "legacy_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "teacher_profile_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teacher_profile_media_legacy_id_key"
    ON "teacher_profile_media"("legacy_id");
CREATE INDEX "teacher_profile_media_teacher_id_type_status_created_at_idx"
    ON "teacher_profile_media"("teacher_id", "type", "status", "created_at");
CREATE INDEX "teacher_profile_media_status_created_at_idx"
    ON "teacher_profile_media"("status", "created_at");
CREATE INDEX "teacher_profile_media_checked_by_idx"
    ON "teacher_profile_media"("checked_by");

ALTER TABLE "teacher_profile_media"
    ADD CONSTRAINT "teacher_profile_media_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "teacher_profile_media"
    ADD CONSTRAINT "teacher_profile_media_checked_by_fkey"
    FOREIGN KEY ("checked_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teacher_profile_media"
    ADD CONSTRAINT "teacher_profile_media_file_size_check"
    CHECK ("file_size" > 0);
