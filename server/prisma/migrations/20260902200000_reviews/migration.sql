CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ReviewReplyStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "teacher_profiles"
    ADD COLUMN "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    ADD COLUMN "reviews_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "teacher_student_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "moderated_by" INTEGER,
    "moderated_at" TIMESTAMPTZ(3),
    "published_rating" INTEGER,
    "published_text" TEXT,
    "published_at" TIMESTAMPTZ(3),
    "teacher_reply" TEXT,
    "pending_teacher_reply" TEXT,
    "reply_status" "ReviewReplyStatus" NOT NULL DEFAULT 'NONE',
    "reply_rejection_reason" TEXT,
    "reply_moderated_by" INTEGER,
    "reply_moderated_at" TIMESTAMPTZ(3),
    "replied_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "reviews_published_rating_check" CHECK (
        "published_rating" IS NULL OR "published_rating" BETWEEN 1 AND 5
    )
);

CREATE UNIQUE INDEX "reviews_teacher_student_id_key"
    ON "reviews"("teacher_student_id");
CREATE INDEX "reviews_teacher_id_published_at_idx"
    ON "reviews"("teacher_id", "published_at");
CREATE INDEX "reviews_status_updated_at_idx"
    ON "reviews"("status", "updated_at");
CREATE INDEX "reviews_reply_status_updated_at_idx"
    ON "reviews"("reply_status", "updated_at");
CREATE INDEX "reviews_subject_id_idx"
    ON "reviews"("subject_id");
CREATE INDEX "reviews_moderated_by_idx"
    ON "reviews"("moderated_by");
CREATE INDEX "reviews_reply_moderated_by_idx"
    ON "reviews"("reply_moderated_by");

ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_teacher_student_id_fkey"
    FOREIGN KEY ("teacher_student_id") REFERENCES "teacher_students"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_moderated_by_fkey"
    FOREIGN KEY ("moderated_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_reply_moderated_by_fkey"
    FOREIGN KEY ("reply_moderated_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
