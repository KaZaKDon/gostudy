CREATE TABLE lesson_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lesson_id INT UNSIGNED NOT NULL,
    status ENUM('waiting', 'active', 'ended')
        NOT NULL DEFAULT 'waiting',
    started_by INT UNSIGNED NULL,
    ended_by INT UNSIGNED NULL,
    started_at DATETIME NULL,
    ended_at DATETIME NULL,
    teacher_joined_at DATETIME NULL,
    student_joined_at DATETIME NULL,
    teacher_last_seen_at DATETIME NULL,
    student_last_seen_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lesson_sessions_lesson (lesson_id),
    KEY idx_lesson_sessions_status (status, updated_at),
    CONSTRAINT fk_lesson_sessions_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lessons (id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_lesson_sessions_started_by
        FOREIGN KEY (started_by)
        REFERENCES users (id)
        ON UPDATE RESTRICT
        ON DELETE SET NULL,
    CONSTRAINT fk_lesson_sessions_ended_by
        FOREIGN KEY (ended_by)
        REFERENCES users (id)
        ON UPDATE RESTRICT
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lesson_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lesson_id INT UNSIGNED NOT NULL,
    sender_id INT UNSIGNED NOT NULL,
    message_text TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_lesson_messages_lesson (lesson_id, id),
    KEY idx_lesson_messages_sender (sender_id, id),
    CONSTRAINT fk_lesson_messages_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lessons (id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_lesson_messages_sender
        FOREIGN KEY (sender_id)
        REFERENCES users (id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lesson_files (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lesson_id INT UNSIGNED NOT NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    stored_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_lesson_files_lesson (lesson_id, id),
    KEY idx_lesson_files_uploader (uploaded_by, id),
    CONSTRAINT fk_lesson_files_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lessons (id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_lesson_files_uploader
        FOREIGN KEY (uploaded_by)
        REFERENCES users (id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
