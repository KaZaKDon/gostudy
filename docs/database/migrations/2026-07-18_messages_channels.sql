-- GoStudy: отдельные каналы «Ученик» и «Родитель» в сообщениях.
-- Выполняется один раз до публикации API из docs/api/messages/.
-- DDL в MySQL выполняет неявные COMMIT, поэтому перед запуском нужна
-- резервная копия таблиц dialogs и messages.

ALTER TABLE dialogs
    ADD COLUMN channel_type ENUM('student', 'parent')
        NOT NULL DEFAULT 'student'
        AFTER student_id;

ALTER TABLE messages
    ADD COLUMN sender_context ENUM('teacher', 'student', 'parent')
        NULL
        AFTER sender_id;

UPDATE messages AS m
INNER JOIN dialogs AS d
    ON d.id = m.dialog_id
INNER JOIN users AS sender
    ON sender.id = m.sender_id
SET m.sender_context = CASE
    WHEN sender.role = 'teacher' THEN 'teacher'
    WHEN d.channel_type = 'parent' THEN 'parent'
    ELSE 'student'
END
WHERE m.sender_context IS NULL;

ALTER TABLE messages
    MODIFY COLUMN sender_context ENUM('teacher', 'student', 'parent')
        NOT NULL
        AFTER sender_id;

UPDATE dialogs AS d
SET d.last_message_at = (
    SELECT MAX(m.created_at)
    FROM messages AS m
    WHERE m.dialog_id = d.id
);

ALTER TABLE dialogs
    DROP INDEX uniq_teacher_student,
    DROP INDEX idx_dialog_teacher,
    DROP INDEX idx_dialog_student,
    ADD UNIQUE INDEX uniq_dialog_participants_channel (
        teacher_id,
        student_id,
        channel_type
    ),
    ADD INDEX idx_dialog_teacher_channel_last (
        teacher_id,
        channel_type,
        last_message_at
    ),
    ADD INDEX idx_dialog_student_channel_last (
        student_id,
        channel_type,
        last_message_at
    );

ALTER TABLE messages
    DROP INDEX idx_messages_dialog,
    DROP INDEX idx_messages_read,
    ADD INDEX idx_messages_dialog_id (
        dialog_id,
        id
    ),
    ADD INDEX idx_messages_dialog_unread (
        dialog_id,
        is_read,
        sender_context,
        id
    );
