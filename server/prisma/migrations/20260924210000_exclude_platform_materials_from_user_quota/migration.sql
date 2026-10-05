-- Materials owned by GoStudy use platform storage and must not consume the
-- personal quota of the account recorded as their technical creator.
-- Recalculate every counter so databases that already applied the original
-- quota migration receive the corrected values as well.
UPDATE "user_storage_usages"
SET
    "used_bytes" = 0,
    "updated_at" = CURRENT_TIMESTAMP;

WITH user_owned_files AS (
    SELECT message."sender_id" AS "user_id", attachment."file_size"::BIGINT AS "file_size"
    FROM "message_attachments" AS attachment
    INNER JOIN "messages" AS message ON message."id" = attachment."message_id"

    UNION ALL
    SELECT "teacher_id", "file_size"::BIGINT FROM "teacher_documents"

    UNION ALL
    SELECT "teacher_id", "file_size"::BIGINT FROM "teacher_profile_media"

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
      AND material."owner_type" = 'TEACHER'
), usage_totals AS (
    SELECT "user_id", SUM("file_size") AS "used_bytes"
    FROM user_owned_files
    GROUP BY "user_id"
)
INSERT INTO "user_storage_usages" (
    "user_id",
    "used_bytes",
    "updated_at"
)
SELECT "user_id", "used_bytes", CURRENT_TIMESTAMP
FROM usage_totals
ON CONFLICT ("user_id") DO UPDATE
SET
    "used_bytes" = EXCLUDED."used_bytes",
    "updated_at" = CURRENT_TIMESTAMP;
