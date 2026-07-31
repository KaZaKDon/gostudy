-- GoStudy: метаданные приватных документов преподавателя.
-- Выполняется один раз до публикации upload-document.php.

ALTER TABLE teacher_documents
    ADD COLUMN mime_type VARCHAR(100) NOT NULL AFTER original_name,
    ADD COLUMN file_size BIGINT UNSIGNED NOT NULL AFTER mime_type;
