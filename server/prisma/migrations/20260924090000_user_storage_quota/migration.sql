CREATE TABLE "user_storage_usages" (
    "user_id" INTEGER NOT NULL,
    "used_bytes" BIGINT NOT NULL DEFAULT 0,
    "limit_bytes" BIGINT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_storage_usages_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_storage_usages_used_bytes_check" CHECK ("used_bytes" >= 0),
    CONSTRAINT "user_storage_usages_limit_bytes_check"
        CHECK ("limit_bytes" IS NULL OR "limit_bytes" > 0)
);

ALTER TABLE "user_storage_usages"
    ADD CONSTRAINT "user_storage_usages_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Account for every file that already belongs to a user. This migration only
-- reads existing records and creates counters; it does not move or delete files.
WITH owned_files AS (
    SELECT message."sender_id" AS "user_id", attachment."file_size"::BIGINT AS "file_size"
    FROM "message_attachments" AS attachment
    INNER JOIN "messages" AS message ON message."id" = attachment."message_id"

    UNION ALL
    SELECT "teacher_id", "file_size" FROM "teacher_documents"

    UNION ALL
    SELECT "teacher_id", "file_size" FROM "teacher_profile_media"

    UNION ALL
    SELECT "uploaded_by", "file_size"::BIGINT FROM "lesson_files"

    UNION ALL
    SELECT homework."teacher_id", attachment."file_size"::BIGINT
    FROM "homework_attachments" AS attachment
    INNER JOIN "homework" AS homework ON homework."id" = attachment."homework_id"

    UNION ALL
    SELECT submission."student_id", attachment."file_size"::BIGINT
    FROM "homework_submission_attachments" AS attachment
    INNER JOIN "homework_submissions" AS submission
        ON submission."id" = attachment."submission_id"

    UNION ALL
    SELECT material."creator_id", item."file_size"::BIGINT
    FROM "material_items" AS item
    INNER JOIN "learning_materials" AS material
        ON material."id" = item."material_id"
    WHERE item."file_size" IS NOT NULL
)
INSERT INTO "user_storage_usages" ("user_id", "used_bytes", "updated_at")
SELECT "user_id", SUM("file_size"), CURRENT_TIMESTAMP
FROM owned_files
GROUP BY "user_id";
