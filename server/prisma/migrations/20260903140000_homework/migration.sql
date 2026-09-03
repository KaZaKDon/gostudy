-- CreateEnum
CREATE TYPE "HomeworkStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HomeworkSubmissionStatus" AS ENUM ('SUBMITTED', 'RETURNED', 'ACCEPTED');

-- CreateTable
CREATE TABLE "homework" (
    "id" SERIAL NOT NULL,
    "teacher_student_id" INTEGER NOT NULL,
    "lesson_id" INTEGER,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "due_date" TIMESTAMPTZ(3),
    "status" "HomeworkStatus" NOT NULL DEFAULT 'ACTIVE',
    "viewed_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_attachments" (
    "id" SERIAL NOT NULL,
    "homework_id" INTEGER NOT NULL,
    "stored_path" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homework_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_submissions" (
    "id" SERIAL NOT NULL,
    "homework_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "answer_text" TEXT,
    "status" "HomeworkSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "grade" VARCHAR(20),
    "teacher_comment" TEXT,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "homework_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_submission_attachments" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "stored_path" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homework_submission_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "homework_teacher_id_status_due_date_idx" ON "homework"("teacher_id", "status", "due_date");
CREATE INDEX "homework_student_id_status_due_date_idx" ON "homework"("student_id", "status", "due_date");
CREATE INDEX "homework_teacher_student_id_created_at_idx" ON "homework"("teacher_student_id", "created_at");
CREATE INDEX "homework_lesson_id_idx" ON "homework"("lesson_id");
CREATE INDEX "homework_subject_id_idx" ON "homework"("subject_id");
CREATE INDEX "homework_attachments_homework_id_id_idx" ON "homework_attachments"("homework_id", "id");
CREATE UNIQUE INDEX "homework_submissions_homework_id_attempt_number_key" ON "homework_submissions"("homework_id", "attempt_number");
CREATE INDEX "homework_submissions_homework_id_status_submitted_at_idx" ON "homework_submissions"("homework_id", "status", "submitted_at");
CREATE INDEX "homework_submissions_student_id_submitted_at_idx" ON "homework_submissions"("student_id", "submitted_at");
CREATE INDEX "homework_submission_attachments_submission_id_id_idx" ON "homework_submission_attachments"("submission_id", "id");

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_teacher_student_id_fkey" FOREIGN KEY ("teacher_student_id") REFERENCES "teacher_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "homework" ADD CONSTRAINT "homework_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "homework" ADD CONSTRAINT "homework_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "homework" ADD CONSTRAINT "homework_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "homework" ADD CONSTRAINT "homework_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "homework_attachments" ADD CONSTRAINT "homework_attachments_homework_id_fkey" FOREIGN KEY ("homework_id") REFERENCES "homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_homework_id_fkey" FOREIGN KEY ("homework_id") REFERENCES "homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "homework_submission_attachments" ADD CONSTRAINT "homework_submission_attachments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "homework_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
