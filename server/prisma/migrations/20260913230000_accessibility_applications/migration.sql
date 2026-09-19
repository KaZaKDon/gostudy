CREATE TYPE "AccessibilityApplicationStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'CONFIRMED',
    'WITHDRAWN',
    'EXPIRED'
);

CREATE TABLE "accessibility_applications" (
    "id" SERIAL NOT NULL,
    "offer_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "submitted_by_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "message" VARCHAR(1000),
    "terms_snapshot" JSONB NOT NULL,
    "status" "AccessibilityApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "teacher_comment" VARCHAR(1000),
    "responded_at" TIMESTAMPTZ(3),
    "confirmation_expires_at" TIMESTAMPTZ(3),
    "confirmed_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accessibility_applications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "accessibility_applications_offer_id_status_idx"
    ON "accessibility_applications"("offer_id", "status");
CREATE INDEX "accessibility_applications_teacher_id_status_created_at_idx"
    ON "accessibility_applications"("teacher_id", "status", "created_at");
CREATE INDEX "accessibility_applications_student_id_status_created_at_idx"
    ON "accessibility_applications"("student_id", "status", "created_at");
CREATE INDEX "accessibility_applications_submitted_by_id_status_created_at_idx"
    ON "accessibility_applications"("submitted_by_id", "status", "created_at");

ALTER TABLE "accessibility_applications" ADD CONSTRAINT "accessibility_applications_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "accessibility_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accessibility_applications" ADD CONSTRAINT "accessibility_applications_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accessibility_applications" ADD CONSTRAINT "accessibility_applications_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accessibility_applications" ADD CONSTRAINT "accessibility_applications_submitted_by_id_fkey"
    FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accessibility_applications" ADD CONSTRAINT "accessibility_applications_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
