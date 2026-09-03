-- Schedule read model for the NestJS backend.
-- All lesson timestamps are stored as PostgreSQL timestamptz and returned in
-- the viewer's profile timezone.

CREATE TYPE "LessonStatus" AS ENUM (
    'SCHEDULED',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'RESCHEDULED'
);

CREATE TYPE "LessonSessionStatus" AS ENUM ('WAITING', 'ACTIVE', 'ENDED');
CREATE TYPE "LessonChangeType" AS ENUM ('RESCHEDULE', 'CANCEL');
CREATE TYPE "LessonChangeStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'WITHDRAWN'
);

CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "subject_id" INTEGER,
    "title" VARCHAR(255),
    "lesson_date" TIMESTAMPTZ(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'SCHEDULED',
    "lesson_topic" VARCHAR(255),
    "lesson_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lessons_duration_minutes_check"
        CHECK ("duration_minutes" IN (45, 60, 90))
);

CREATE TABLE "lesson_sessions" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "status" "LessonSessionStatus" NOT NULL DEFAULT 'WAITING',
    "started_at" TIMESTAMPTZ(3),
    "ended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lesson_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lesson_change_requests" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "requested_role" "UserRole" NOT NULL,
    "request_type" "LessonChangeType" NOT NULL,
    "status" "LessonChangeStatus" NOT NULL DEFAULT 'PENDING',
    "original_lesson_date" TIMESTAMPTZ(3) NOT NULL,
    "proposed_lesson_date" TIMESTAMPTZ(3),
    "request_comment" TEXT NOT NULL,
    "response_comment" TEXT,
    "responded_by" INTEGER,
    "responded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lesson_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lessons_teacher_id_lesson_date_idx"
    ON "lessons"("teacher_id", "lesson_date");
CREATE INDEX "lessons_student_id_lesson_date_idx"
    ON "lessons"("student_id", "lesson_date");
CREATE INDEX "lessons_status_lesson_date_idx"
    ON "lessons"("status", "lesson_date");
CREATE UNIQUE INDEX "lesson_sessions_lesson_id_key"
    ON "lesson_sessions"("lesson_id");
CREATE INDEX "lesson_change_requests_lesson_id_status_created_at_idx"
    ON "lesson_change_requests"("lesson_id", "status", "created_at");
CREATE INDEX "lesson_change_requests_requested_by_status_idx"
    ON "lesson_change_requests"("requested_by", "status");

ALTER TABLE "lessons" ADD CONSTRAINT "lessons_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_change_requests" ADD CONSTRAINT "lesson_change_requests_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_change_requests" ADD CONSTRAINT "lesson_change_requests_requested_by_fkey"
    FOREIGN KEY ("requested_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lesson_change_requests" ADD CONSTRAINT "lesson_change_requests_responded_by_fkey"
    FOREIGN KEY ("responded_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
