-- CreateEnum
CREATE TYPE "MaterialOwnerType" AS ENUM ('PLATFORM', 'TEACHER');
CREATE TYPE "MaterialCategory" AS ENUM ('TEXTBOOK', 'TRAINER', 'EXTRA');
CREATE TYPE "MaterialContentType" AS ENUM ('FILE', 'EXTERNAL_LINK', 'INTERACTIVE_LINK');
CREATE TYPE "MaterialAccessType" AS ENUM ('FREE', 'PAID');
CREATE TYPE "MaterialPublicationStatus" AS ENUM ('PRIVATE', 'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');
CREATE TYPE "MaterialAccessSource" AS ENUM ('ASSIGNMENT', 'PURCHASE', 'MANUAL');
CREATE TYPE "MaterialReportReason" AS ENUM ('COPYRIGHT', 'INAPPROPRIATE', 'HARMFUL', 'BROKEN_LINK', 'OTHER');
CREATE TYPE "MaterialReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "learning_materials" (
    "id" SERIAL NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "owner_type" "MaterialOwnerType" NOT NULL DEFAULT 'TEACHER',
    "subject_id" INTEGER NOT NULL,
    "category" "MaterialCategory" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "author_name" VARCHAR(255) NOT NULL,
    "access_type" "MaterialAccessType" NOT NULL DEFAULT 'FREE',
    "price_rub" DECIMAL(12,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'RUB',
    "publication_status" "MaterialPublicationStatus" NOT NULL DEFAULT 'PRIVATE',
    "moderation_comment" TEXT,
    "moderated_by" INTEGER,
    "moderated_at" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "learning_materials_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "learning_materials_paid_price_check" CHECK (
        ("access_type" = 'FREE' AND "price_rub" IS NULL)
        OR ("access_type" = 'PAID' AND "price_rub" > 0)
    ),
    CONSTRAINT "learning_materials_currency_check" CHECK ("currency" = 'RUB')
);

CREATE TABLE "material_items" (
    "id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content_type" "MaterialContentType" NOT NULL,
    "stored_path" VARCHAR(500),
    "original_name" VARCHAR(255),
    "mime_type" VARCHAR(120),
    "file_size" INTEGER,
    "external_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "material_items_source_check" CHECK (
        ("content_type" = 'FILE' AND "stored_path" IS NOT NULL AND "original_name" IS NOT NULL AND "mime_type" IS NOT NULL AND "file_size" IS NOT NULL AND "external_url" IS NULL)
        OR ("content_type" IN ('EXTERNAL_LINK', 'INTERACTIVE_LINK') AND "external_url" IS NOT NULL AND "stored_path" IS NULL AND "original_name" IS NULL AND "mime_type" IS NULL AND "file_size" IS NULL)
    )
);

CREATE TABLE "material_assignments" (
    "id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "teacher_student_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "material_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "material_access_grants" (
    "id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "source" "MaterialAccessSource" NOT NULL,
    "source_key" VARCHAR(120) NOT NULL,
    "granted_by" INTEGER,
    "expires_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_access_grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "material_reports" (
    "id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "reason" "MaterialReportReason" NOT NULL,
    "comment" TEXT,
    "status" "MaterialReportStatus" NOT NULL DEFAULT 'PENDING',
    "handled_by" INTEGER,
    "resolution_comment" TEXT,
    "handled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "material_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_materials_creator_id_publication_status_updated_at_idx" ON "learning_materials"("creator_id", "publication_status", "updated_at");
CREATE INDEX "learning_materials_publication_status_category_subject_id_published_at_idx" ON "learning_materials"("publication_status", "category", "subject_id", "published_at");
CREATE INDEX "learning_materials_moderated_by_idx" ON "learning_materials"("moderated_by");
CREATE INDEX "material_items_material_id_sort_order_id_idx" ON "material_items"("material_id", "sort_order", "id");
CREATE UNIQUE INDEX "material_assignments_material_id_teacher_student_id_key" ON "material_assignments"("material_id", "teacher_student_id");
CREATE INDEX "material_assignments_student_id_revoked_at_assigned_at_idx" ON "material_assignments"("student_id", "revoked_at", "assigned_at");
CREATE INDEX "material_assignments_teacher_id_revoked_at_assigned_at_idx" ON "material_assignments"("teacher_id", "revoked_at", "assigned_at");
CREATE UNIQUE INDEX "material_access_grants_material_id_user_id_source_key_key" ON "material_access_grants"("material_id", "user_id", "source_key");
CREATE INDEX "material_access_grants_user_id_revoked_at_expires_at_idx" ON "material_access_grants"("user_id", "revoked_at", "expires_at");
CREATE INDEX "material_access_grants_granted_by_idx" ON "material_access_grants"("granted_by");
CREATE INDEX "material_reports_status_created_at_idx" ON "material_reports"("status", "created_at");
CREATE INDEX "material_reports_material_id_reporter_id_created_at_idx" ON "material_reports"("material_id", "reporter_id", "created_at");
CREATE INDEX "material_reports_handled_by_idx" ON "material_reports"("handled_by");

-- AddForeignKey
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_items" ADD CONSTRAINT "material_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "learning_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_assignments" ADD CONSTRAINT "material_assignments_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "learning_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_assignments" ADD CONSTRAINT "material_assignments_teacher_student_id_fkey" FOREIGN KEY ("teacher_student_id") REFERENCES "teacher_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_assignments" ADD CONSTRAINT "material_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_assignments" ADD CONSTRAINT "material_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_assignments" ADD CONSTRAINT "material_assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_access_grants" ADD CONSTRAINT "material_access_grants_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "learning_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_access_grants" ADD CONSTRAINT "material_access_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_access_grants" ADD CONSTRAINT "material_access_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "material_reports" ADD CONSTRAINT "material_reports_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "learning_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_reports" ADD CONSTRAINT "material_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_reports" ADD CONSTRAINT "material_reports_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
