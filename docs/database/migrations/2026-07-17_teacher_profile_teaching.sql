-- GoStudy: окончательная нормализация шага «Преподавание».
-- Перед запуском должны выполняться условия:
--   1. В subjects нет строк с group_id IS NULL.
--   2. В проверках потерянных связей из документации получены нули.
--   3. Устаревшие поля teacher_profiles не содержат данных.
--
-- DDL в MySQL выполняет неявные COMMIT, поэтому миграция запускается один раз
-- целиком после резервной копии структуры и данных.

ALTER TABLE subjects
    MODIFY group_id INT(10) UNSIGNED NOT NULL;

ALTER TABLE teacher_education
    ADD CONSTRAINT fk_teacher_education_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;

ALTER TABLE teacher_documents
    ADD CONSTRAINT fk_teacher_documents_education
        FOREIGN KEY (education_id)
        REFERENCES teacher_education (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;

ALTER TABLE teacher_subject_preparations
    ADD INDEX idx_tsp_subject_preparation (subject_id, preparation_id),
    ADD CONSTRAINT fk_tsp_teacher_subject
        FOREIGN KEY (teacher_id, subject_id)
        REFERENCES teacher_subjects (teacher_id, subject_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_tsp_allowed_preparation
        FOREIGN KEY (subject_id, preparation_id)
        REFERENCES subject_preparations (subject_id, preparation_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;

ALTER TABLE teacher_profiles
    DROP COLUMN education,
    DROP COLUMN certificates,
    DROP COLUMN student_levels,
    DROP COLUMN lesson_goals,
    DROP COLUMN lesson_format,
    DROP COLUMN price_per_lesson,
    DROP COLUMN price_per_hour;
