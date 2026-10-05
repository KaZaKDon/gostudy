CREATE TYPE "LessonDisputeReason" AS ENUM (
    'NO_SHOW',
    'LATE_CANCELLATION',
    'LESSON_NOT_HELD',
    'LESSON_QUALITY',
    'OTHER'
);

CREATE TYPE "LessonDisputeStatus" AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'REJECTED'
);

CREATE TYPE "LessonDisputeResolution" AS ENUM (
    'APPLICANT_SUPPORTED',
    'RESPONDENT_SUPPORTED',
    'MUTUAL_AGREEMENT',
    'NO_VIOLATION'
);

CREATE TABLE "lesson_disputes" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "opened_by" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "reason" "LessonDisputeReason" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "LessonDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" "LessonDisputeResolution",
    "resolution_comment" TEXT,
    "handled_by" INTEGER,
    "handled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "lesson_disputes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lesson_dispute_messages" (
    "id" SERIAL NOT NULL,
    "dispute_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "message_text" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_dispute_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lesson_dispute_attachments" (
    "id" SERIAL NOT NULL,
    "dispute_id" INTEGER NOT NULL,
    "message_id" INTEGER,
    "uploaded_by" INTEGER NOT NULL,
    "stored_path" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_dispute_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lesson_dispute_events" (
    "id" SERIAL NOT NULL,
    "dispute_id" INTEGER NOT NULL,
    "actor_id" INTEGER,
    "event_type" VARCHAR(80) NOT NULL,
    "from_status" "LessonDisputeStatus",
    "to_status" "LessonDisputeStatus",
    "details" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_dispute_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lesson_disputes_lesson_id_key" ON "lesson_disputes"("lesson_id");
CREATE INDEX "lesson_disputes_status_updated_at_id_idx" ON "lesson_disputes"("status", "updated_at", "id");
CREATE INDEX "lesson_disputes_teacher_id_status_created_at_idx" ON "lesson_disputes"("teacher_id", "status", "created_at");
CREATE INDEX "lesson_disputes_student_id_status_created_at_idx" ON "lesson_disputes"("student_id", "status", "created_at");
CREATE INDEX "lesson_disputes_opened_by_created_at_idx" ON "lesson_disputes"("opened_by", "created_at");
CREATE INDEX "lesson_disputes_handled_by_handled_at_idx" ON "lesson_disputes"("handled_by", "handled_at");
CREATE INDEX "lesson_dispute_messages_dispute_id_id_idx" ON "lesson_dispute_messages"("dispute_id", "id");
CREATE INDEX "lesson_dispute_messages_author_id_created_at_idx" ON "lesson_dispute_messages"("author_id", "created_at");
CREATE INDEX "lesson_dispute_attachments_dispute_id_id_idx" ON "lesson_dispute_attachments"("dispute_id", "id");
CREATE INDEX "lesson_dispute_attachments_message_id_id_idx" ON "lesson_dispute_attachments"("message_id", "id");
CREATE INDEX "lesson_dispute_attachments_uploaded_by_id_idx" ON "lesson_dispute_attachments"("uploaded_by", "id");
CREATE INDEX "lesson_dispute_events_dispute_id_id_idx" ON "lesson_dispute_events"("dispute_id", "id");
CREATE INDEX "lesson_dispute_events_actor_id_created_at_idx" ON "lesson_dispute_events"("actor_id", "created_at");

ALTER TABLE "lesson_disputes"
    ADD CONSTRAINT "lesson_disputes_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "lesson_disputes_opened_by_fkey"
    FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "lesson_disputes_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "lesson_disputes_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "lesson_disputes_handled_by_fkey"
    FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lesson_dispute_messages"
    ADD CONSTRAINT "lesson_dispute_messages_dispute_id_fkey"
    FOREIGN KEY ("dispute_id") REFERENCES "lesson_disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "lesson_dispute_messages_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesson_dispute_attachments"
    ADD CONSTRAINT "lesson_dispute_attachments_dispute_id_fkey"
    FOREIGN KEY ("dispute_id") REFERENCES "lesson_disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "lesson_dispute_attachments_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "lesson_dispute_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "lesson_dispute_attachments_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesson_dispute_events"
    ADD CONSTRAINT "lesson_dispute_events_dispute_id_fkey"
    FOREIGN KEY ("dispute_id") REFERENCES "lesson_disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "lesson_dispute_events_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
