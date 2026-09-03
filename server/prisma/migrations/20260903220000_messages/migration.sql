-- CreateEnum
CREATE TYPE "ParentStudentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "MessageChannelType" AS ENUM ('STUDENT', 'PARENT');
CREATE TYPE "MessageSenderContext" AS ENUM ('TEACHER', 'STUDENT', 'PARENT');
CREATE TYPE "MessageReportReason" AS ENUM ('SPAM', 'ABUSE', 'INAPPROPRIATE', 'THREAT', 'OTHER');
CREATE TYPE "MessageReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "parent_students" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "status" "ParentStudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parent_students_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_dialogs" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "channel_type" "MessageChannelType" NOT NULL,
    "channel_key" VARCHAR(80) NOT NULL,
    "last_message_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "message_dialogs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "message_dialogs_channel_check" CHECK (
        ("channel_type" = 'STUDENT' AND "parent_id" IS NULL AND "channel_key" = 'student')
        OR
        ("channel_type" = 'PARENT' AND "parent_id" IS NOT NULL AND "channel_key" = 'parent:' || "parent_id"::text)
    )
);

CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "dialog_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "sender_context" "MessageSenderContext" NOT NULL,
    "message_text" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(3),
    "hidden_at" TIMESTAMPTZ(3),
    "hidden_by" INTEGER,
    "hidden_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_attachments" (
    "id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "stored_path" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_reports" (
    "id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "reason" "MessageReportReason" NOT NULL,
    "comment" TEXT,
    "status" "MessageReportStatus" NOT NULL DEFAULT 'PENDING',
    "handled_by" INTEGER,
    "resolution_comment" TEXT,
    "handled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "message_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parent_students_parent_id_student_id_key" ON "parent_students"("parent_id", "student_id");
CREATE INDEX "parent_students_student_id_status_idx" ON "parent_students"("student_id", "status");
CREATE UNIQUE INDEX "message_dialogs_teacher_id_student_id_channel_key_key" ON "message_dialogs"("teacher_id", "student_id", "channel_key");
CREATE INDEX "message_dialogs_teacher_id_last_message_at_idx" ON "message_dialogs"("teacher_id", "last_message_at");
CREATE INDEX "message_dialogs_student_id_last_message_at_idx" ON "message_dialogs"("student_id", "last_message_at");
CREATE INDEX "message_dialogs_parent_id_last_message_at_idx" ON "message_dialogs"("parent_id", "last_message_at");
CREATE INDEX "messages_dialog_id_id_idx" ON "messages"("dialog_id", "id");
CREATE INDEX "messages_dialog_id_is_read_sender_id_id_idx" ON "messages"("dialog_id", "is_read", "sender_id", "id");
CREATE INDEX "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at");
CREATE INDEX "messages_hidden_by_idx" ON "messages"("hidden_by");
CREATE INDEX "message_attachments_message_id_id_idx" ON "message_attachments"("message_id", "id");
CREATE INDEX "message_reports_status_created_at_idx" ON "message_reports"("status", "created_at");
CREATE INDEX "message_reports_message_id_reporter_id_created_at_idx" ON "message_reports"("message_id", "reporter_id", "created_at");
CREATE INDEX "message_reports_handled_by_idx" ON "message_reports"("handled_by");

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_dialogs" ADD CONSTRAINT "message_dialogs_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_dialogs" ADD CONSTRAINT "message_dialogs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_dialogs" ADD CONSTRAINT "message_dialogs_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_dialog_id_fkey" FOREIGN KEY ("dialog_id") REFERENCES "message_dialogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
