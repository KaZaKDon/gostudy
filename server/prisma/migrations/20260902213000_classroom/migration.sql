ALTER TABLE "lesson_sessions"
    ADD COLUMN "started_by" INTEGER,
    ADD COLUMN "ended_by" INTEGER,
    ADD COLUMN "teacher_joined_at" TIMESTAMPTZ(3),
    ADD COLUMN "student_joined_at" TIMESTAMPTZ(3),
    ADD COLUMN "teacher_last_seen_at" TIMESTAMPTZ(3),
    ADD COLUMN "student_last_seen_at" TIMESTAMPTZ(3);

CREATE INDEX "lesson_sessions_status_updated_at_idx"
    ON "lesson_sessions"("status", "updated_at");
CREATE INDEX "lesson_sessions_started_by_idx"
    ON "lesson_sessions"("started_by");
CREATE INDEX "lesson_sessions_ended_by_idx"
    ON "lesson_sessions"("ended_by");

ALTER TABLE "lesson_sessions"
    ADD CONSTRAINT "lesson_sessions_started_by_fkey"
    FOREIGN KEY ("started_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lesson_sessions"
    ADD CONSTRAINT "lesson_sessions_ended_by_fkey"
    FOREIGN KEY ("ended_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "lesson_messages" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "message_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lesson_messages_lesson_id_id_idx"
    ON "lesson_messages"("lesson_id", "id");
CREATE INDEX "lesson_messages_sender_id_id_idx"
    ON "lesson_messages"("sender_id", "id");

ALTER TABLE "lesson_messages"
    ADD CONSTRAINT "lesson_messages_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_messages"
    ADD CONSTRAINT "lesson_messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "lesson_files" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "stored_path" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_files_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lesson_files_size_check" CHECK ("file_size" >= 0)
);

CREATE INDEX "lesson_files_lesson_id_id_idx"
    ON "lesson_files"("lesson_id", "id");
CREATE INDEX "lesson_files_uploaded_by_id_idx"
    ON "lesson_files"("uploaded_by", "id");

ALTER TABLE "lesson_files"
    ADD CONSTRAINT "lesson_files_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_files"
    ADD CONSTRAINT "lesson_files_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "lesson_workspace_state" (
    "lesson_id" INTEGER NOT NULL,
    "is_sharing" BOOLEAN NOT NULL DEFAULT false,
    "shared_file_id" INTEGER,
    "shared_page" INTEGER NOT NULL DEFAULT 1,
    "updated_by" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "lesson_workspace_state_pkey" PRIMARY KEY ("lesson_id"),
    CONSTRAINT "lesson_workspace_page_check" CHECK ("shared_page" >= 1),
    CONSTRAINT "lesson_workspace_version_check" CHECK ("version" >= 0)
);

CREATE INDEX "lesson_workspace_state_shared_file_id_idx"
    ON "lesson_workspace_state"("shared_file_id");
CREATE INDEX "lesson_workspace_state_updated_by_idx"
    ON "lesson_workspace_state"("updated_by");

ALTER TABLE "lesson_workspace_state"
    ADD CONSTRAINT "lesson_workspace_state_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_workspace_state"
    ADD CONSTRAINT "lesson_workspace_state_shared_file_id_fkey"
    FOREIGN KEY ("shared_file_id") REFERENCES "lesson_files"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lesson_workspace_state"
    ADD CONSTRAINT "lesson_workspace_state_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "lesson_results" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "attendance" VARCHAR(40),
    "grade" VARCHAR(20),
    "lesson_result" TEXT,
    "teacher_comment" TEXT,
    "teacher_note" TEXT,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "lesson_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lesson_results_lesson_id_key"
    ON "lesson_results"("lesson_id");

ALTER TABLE "lesson_results"
    ADD CONSTRAINT "lesson_results_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
