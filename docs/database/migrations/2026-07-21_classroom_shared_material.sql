CREATE TABLE IF NOT EXISTS lesson_workspace_state (
    lesson_id INT UNSIGNED NOT NULL,
    is_sharing TINYINT(1) NOT NULL DEFAULT 0,
    shared_file_id BIGINT UNSIGNED NULL,
    shared_page INT UNSIGNED NOT NULL DEFAULT 1,
    updated_by INT UNSIGNED NULL,
    version INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (lesson_id),
    KEY idx_lesson_workspace_shared_file (shared_file_id),
    KEY idx_lesson_workspace_updated_by (updated_by),
    CONSTRAINT fk_lesson_workspace_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lessons (id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_lesson_workspace_shared_file
        FOREIGN KEY (shared_file_id)
        REFERENCES lesson_files (id)
        ON UPDATE RESTRICT
        ON DELETE SET NULL,
    CONSTRAINT fk_lesson_workspace_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE RESTRICT
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
