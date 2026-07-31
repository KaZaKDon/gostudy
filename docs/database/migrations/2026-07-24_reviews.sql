/*
GoStudy: окончательная структура отзывов.

Миграцию можно запускать повторно. Перед каждым ADD проверяется фактическая
структура текущей базы, поэтому уже существующие столбцы, индексы и внешние
ключи не создаются второй раз.
*/

SET @gostudy_schema = DATABASE();

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'teacher_student_id'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN teacher_student_id INT UNSIGNED NULL AFTER teacher_id'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'subject_id'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN subject_id INT UNSIGNED NULL AFTER teacher_student_id'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'published_rating'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN published_rating TINYINT UNSIGNED NULL AFTER rating'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'published_text'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN published_text TEXT NULL AFTER text'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'rejection_reason'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN rejection_reason TEXT NULL AFTER status'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'moderated_by'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN moderated_by INT UNSIGNED NULL AFTER rejection_reason'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'moderated_at'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN moderated_at DATETIME NULL AFTER moderated_by'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'published_at'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN published_at DATETIME NULL AFTER moderated_at'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'teacher_reply'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN teacher_reply TEXT NULL AFTER published_at'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'pending_teacher_reply'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN pending_teacher_reply TEXT NULL AFTER teacher_reply'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'reply_status'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN reply_status ENUM(''none'', ''pending'', ''approved'', ''rejected'') NOT NULL DEFAULT ''none'' AFTER pending_teacher_reply'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'reply_rejection_reason'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN reply_rejection_reason TEXT NULL AFTER reply_status'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'reply_moderated_by'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN reply_moderated_by INT UNSIGNED NULL AFTER reply_rejection_reason'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'reply_moderated_at'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN reply_moderated_at DATETIME NULL AFTER reply_moderated_by'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'replied_at'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN replied_at DATETIME NULL AFTER reply_moderated_at'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'updated_at'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

/*
Выравниваем типы уже существовавших служебных полей.
*/
ALTER TABLE reviews
    MODIFY COLUMN teacher_student_id INT UNSIGNED NULL,
    MODIFY COLUMN subject_id INT UNSIGNED NULL,
    MODIFY COLUMN moderated_by INT UNSIGNED NULL,
    MODIFY COLUMN reply_moderated_by INT UNSIGNED NULL,
    MODIFY COLUMN status ENUM(
        'pending',
        'approved',
        'rejected'
    ) NOT NULL DEFAULT 'pending',
    MODIFY COLUMN reply_status ENUM(
        'none',
        'pending',
        'approved',
        'rejected'
    ) NOT NULL DEFAULT 'none';

/*
Сохраняем ранее одобренные отзывы как опубликованные.
*/
UPDATE reviews
SET
    published_rating = rating,
    published_text = text,
    published_at = COALESCE(published_at, created_at)
WHERE status = 'approved'
  AND published_at IS NULL;

/*
Автоматически связываем только однозначные старые данные:
один отзыв и одна связь по паре ученик–преподаватель.
*/
DROP TEMPORARY TABLE IF EXISTS review_relation_backfill;

CREATE TEMPORARY TABLE review_relation_backfill AS
SELECT
    r.teacher_id,
    r.student_id,
    MIN(ts.id) AS teacher_student_id,
    MIN(ts.subject_id) AS subject_id
FROM reviews AS r
INNER JOIN teacher_students AS ts
    ON ts.teacher_id = r.teacher_id
   AND ts.student_id = r.student_id
GROUP BY
    r.teacher_id,
    r.student_id
HAVING COUNT(DISTINCT r.id) = 1
   AND COUNT(DISTINCT ts.id) = 1;

UPDATE reviews AS r
INNER JOIN review_relation_backfill AS relation
    ON relation.teacher_id = r.teacher_id
   AND relation.student_id = r.student_id
SET
    r.teacher_student_id = COALESCE(
        r.teacher_student_id,
        relation.teacher_student_id
    ),
    r.subject_id = COALESCE(
        r.subject_id,
        relation.subject_id
    );

DROP TEMPORARY TABLE review_relation_backfill;

/*
Индексы.
*/
SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND INDEX_NAME = 'uq_reviews_teacher_student'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD UNIQUE KEY uq_reviews_teacher_student (teacher_student_id)'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND INDEX_NAME = 'idx_reviews_teacher_published'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD KEY idx_reviews_teacher_published (teacher_id, published_at)'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND INDEX_NAME = 'idx_reviews_review_moderation'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD KEY idx_reviews_review_moderation (status, updated_at)'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND INDEX_NAME = 'idx_reviews_reply_moderation'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD KEY idx_reviews_reply_moderation (reply_status, updated_at)'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND INDEX_NAME = 'idx_reviews_subject'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD KEY idx_reviews_subject (subject_id)'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

/*
Внешние ключи. Проверяется не только имя ограничения, но и наличие любого
внешнего ключа на соответствующем столбце.
*/
SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'teacher_student_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD CONSTRAINT fk_reviews_teacher_student FOREIGN KEY (teacher_student_id) REFERENCES teacher_students (id) ON UPDATE RESTRICT ON DELETE SET NULL'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'subject_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD CONSTRAINT fk_reviews_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON UPDATE RESTRICT ON DELETE SET NULL'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'moderated_by'
          AND REFERENCED_TABLE_NAME IS NOT NULL
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD CONSTRAINT fk_reviews_moderated_by FOREIGN KEY (moderated_by) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE SET NULL'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

SET @gostudy_sql = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = @gostudy_schema
          AND TABLE_NAME = 'reviews'
          AND COLUMN_NAME = 'reply_moderated_by'
          AND REFERENCED_TABLE_NAME IS NOT NULL
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD CONSTRAINT fk_reviews_reply_moderated_by FOREIGN KEY (reply_moderated_by) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE SET NULL'
);
PREPARE gostudy_stmt FROM @gostudy_sql;
EXECUTE gostudy_stmt;
DEALLOCATE PREPARE gostudy_stmt;

/*
Пересчёт рейтинга по опубликованным версиям.
*/
UPDATE teacher_profiles AS tp
LEFT JOIN (
    SELECT
        teacher_id,
        ROUND(AVG(published_rating), 2) AS rating,
        COUNT(*) AS reviews_count
    FROM reviews
    WHERE published_at IS NOT NULL
      AND published_rating IS NOT NULL
    GROUP BY teacher_id
) AS review_summary
    ON review_summary.teacher_id = tp.user_id
SET
    tp.rating = COALESCE(review_summary.rating, 0),
    tp.reviews_count = COALESCE(review_summary.reviews_count, 0);

/*
Контрольный результат. Значение missing_columns должно быть равно 0.
*/
SELECT COUNT(*) AS missing_columns
FROM (
    SELECT 'teacher_student_id' AS column_name
    UNION ALL SELECT 'subject_id'
    UNION ALL SELECT 'published_rating'
    UNION ALL SELECT 'published_text'
    UNION ALL SELECT 'rejection_reason'
    UNION ALL SELECT 'moderated_by'
    UNION ALL SELECT 'moderated_at'
    UNION ALL SELECT 'published_at'
    UNION ALL SELECT 'teacher_reply'
    UNION ALL SELECT 'pending_teacher_reply'
    UNION ALL SELECT 'reply_status'
    UNION ALL SELECT 'reply_rejection_reason'
    UNION ALL SELECT 'reply_moderated_by'
    UNION ALL SELECT 'reply_moderated_at'
    UNION ALL SELECT 'replied_at'
    UNION ALL SELECT 'updated_at'
) AS expected
LEFT JOIN information_schema.COLUMNS AS actual
    ON actual.TABLE_SCHEMA = @gostudy_schema
   AND actual.TABLE_NAME = 'reviews'
   AND actual.COLUMN_NAME = expected.column_name
WHERE actual.COLUMN_NAME IS NULL;
