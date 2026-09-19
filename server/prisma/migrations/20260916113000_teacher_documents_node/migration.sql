CREATE TYPE "TeacherDocumentType" AS ENUM (
    'DIPLOMA',
    'CERTIFICATE',
    'QUALIFICATION',
    'OTHER'
);

CREATE TYPE "TeacherDocumentStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

CREATE TABLE "teacher_documents" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "education_id" INTEGER,
    "type" "TeacherDocumentType" NOT NULL,
    "document_title" VARCHAR(255) NOT NULL,
    "institution" VARCHAR(255),
    "document_year" INTEGER,
    "stored_path" TEXT NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "status" "TeacherDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" VARCHAR(2000),
    "checked_by" INTEGER,
    "checked_at" TIMESTAMPTZ(3),
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "legacy_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "teacher_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teacher_documents_legacy_id_key"
    ON "teacher_documents"("legacy_id");
CREATE INDEX "teacher_documents_teacher_id_status_created_at_idx"
    ON "teacher_documents"("teacher_id", "status", "created_at");
CREATE INDEX "teacher_documents_status_created_at_idx"
    ON "teacher_documents"("status", "created_at");
CREATE INDEX "teacher_documents_education_id_idx"
    ON "teacher_documents"("education_id");
CREATE INDEX "teacher_documents_checked_by_idx"
    ON "teacher_documents"("checked_by");

ALTER TABLE "teacher_documents"
    ADD CONSTRAINT "teacher_documents_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "teacher_documents"
    ADD CONSTRAINT "teacher_documents_education_id_fkey"
    FOREIGN KEY ("education_id") REFERENCES "teacher_education"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teacher_documents"
    ADD CONSTRAINT "teacher_documents_checked_by_fkey"
    FOREIGN KEY ("checked_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teacher_documents"
    ADD CONSTRAINT "teacher_documents_file_size_check"
    CHECK ("file_size" > 0);

ALTER TABLE "teacher_documents"
    ADD CONSTRAINT "teacher_documents_document_year_check"
    CHECK (
        "document_year" IS NULL
        OR "document_year" BETWEEN 1950 AND 2100
    );
