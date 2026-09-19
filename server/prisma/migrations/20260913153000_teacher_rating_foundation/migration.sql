-- One child has one current review for one teacher, regardless of subject.
-- Keep the latest edited review if legacy data contains duplicates.
WITH ranked_reviews AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY teacher_id, student_id
            ORDER BY updated_at DESC, id DESC
        ) AS duplicate_number
    FROM reviews
)
DELETE FROM reviews
WHERE id IN (
    SELECT id
    FROM ranked_reviews
    WHERE duplicate_number > 1
);

ALTER TABLE reviews
ADD COLUMN submitted_by INTEGER;

UPDATE reviews
SET submitted_by = student_id
WHERE submitted_by IS NULL;

ALTER TABLE reviews
ALTER COLUMN submitted_by SET NOT NULL;

ALTER TABLE reviews
ADD CONSTRAINT reviews_submitted_by_fkey
FOREIGN KEY (submitted_by) REFERENCES users(id)
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE reviews
ADD CONSTRAINT reviews_teacher_id_student_id_key
UNIQUE (teacher_id, student_id);

CREATE INDEX reviews_submitted_by_idx ON reviews(submitted_by);

-- Rebuild cached public totals in case legacy duplicate rows were removed.
UPDATE teacher_profiles AS profile
SET
    rating = COALESCE(summary.average_rating, 0),
    reviews_count = COALESCE(summary.reviews_count, 0)
FROM (
    SELECT
        teacher.user_id,
        AVG(review.published_rating)::numeric(3, 2) AS average_rating,
        COUNT(review.id)::integer AS reviews_count
    FROM teacher_profiles AS teacher
    LEFT JOIN reviews AS review
        ON review.teacher_id = teacher.user_id
        AND review.published_at IS NOT NULL
        AND review.published_rating IS NOT NULL
    GROUP BY teacher.user_id
) AS summary
WHERE profile.user_id = summary.user_id;
