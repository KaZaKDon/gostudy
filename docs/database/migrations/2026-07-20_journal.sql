ALTER TABLE lesson_results
    ADD COLUMN teacher_note TEXT NULL AFTER teacher_comment,
    ADD COLUMN published_at DATETIME NULL AFTER teacher_note;

UPDATE lesson_results
SET published_at = COALESCE(updated_at, created_at)
WHERE published_at IS NULL
  AND (
      attendance IS NOT NULL
      OR grade IS NOT NULL
      OR lesson_result IS NOT NULL
      OR teacher_comment IS NOT NULL
  );
