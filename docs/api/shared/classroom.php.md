<?php

declare(strict_types=1);

require_once __DIR__ . '/lesson-management.php';
require_once __DIR__ . '/upload.php';

const CLASSROOM_ENTRY_ADVANCE_MINUTES = 15;
const CLASSROOM_START_GRACE_MINUTES = 30;
const CLASSROOM_PRESENCE_TIMEOUT_SECONDS = 20;
const CLASSROOM_MESSAGE_MAX_LENGTH = 2000;
const CLASSROOM_NOTE_MAX_LENGTH = 5000;
const CLASSROOM_MAX_FILES_PER_UPLOAD = 5;
const CLASSROOM_INITIAL_MESSAGE_LIMIT = 100;
const CLASSROOM_SYNC_MESSAGE_LIMIT = 100;

function classroomParsePositiveId(mixed $value, string $label): int
{
    $id = filter_var($value, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
    ]);

    if ($id === false) {
        throw new InvalidArgumentException('Некорректно указан ' . $label);
    }

    return (int) $id;
}

function classroomRequireRole(array $user): void
{
    if (!in_array($user['role'] ?? null, ['teacher', 'student'], true)) {
        errorResponse('Класс доступен только преподавателю или ученику', 403);
    }
}

function classroomFindLesson(
    PDO $pdo,
    int $lessonId,
    array $user,
    bool $forUpdate = false
): ?array {
    $sql = "
        SELECT
            l.id,
            l.teacher_id,
            l.student_id,
            l.subject_id,
            l.title,
            l.lesson_date,
            l.duration_minutes,
            l.status,
            l.lesson_topic,
            l.lesson_notes,
            teachers.full_name AS teacher_name,
            teachers.avatar_url AS teacher_avatar_url,
            students.full_name AS student_name,
            students.avatar_url AS student_avatar_url,
            subjects.name AS subject_name,
            relations.id AS relation_id
        FROM lessons l
        INNER JOIN users teachers
            ON teachers.id = l.teacher_id
           AND teachers.role = 'teacher'
        INNER JOIN users students
            ON students.id = l.student_id
           AND students.role = 'student'
        LEFT JOIN subjects
            ON subjects.id = l.subject_id
        LEFT JOIN teacher_students relations
            ON relations.teacher_id = l.teacher_id
           AND relations.student_id = l.student_id
           AND relations.subject_id = l.subject_id
           AND relations.status = 'active'
        WHERE l.id = :lesson_id
          AND (
              l.teacher_id = :teacher_id
              OR l.student_id = :student_id
          )
        LIMIT 1
    ";

    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'lesson_id' => $lessonId,
        'teacher_id' => (int) $user['id'],
        'student_id' => (int) $user['id'],
    ]);

    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function classroomGetSession(
    PDO $pdo,
    int $lessonId,
    bool $forUpdate = false
): ?array {
    $sql = "
        SELECT
            id,
            lesson_id,
            status,
            started_by,
            ended_by,
            started_at,
            ended_at,
            teacher_joined_at,
            student_joined_at,
            teacher_last_seen_at,
            student_last_seen_at,
            created_at,
            updated_at
        FROM lesson_sessions
        WHERE lesson_id = :lesson_id
        LIMIT 1
    ";

    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['lesson_id' => $lessonId]);

    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function classroomEnsureSession(PDO $pdo, int $lessonId): array
{
    $stmt = $pdo->prepare("
        INSERT INTO lesson_sessions (lesson_id, status)
        VALUES (:lesson_id, 'waiting')
        ON DUPLICATE KEY UPDATE lesson_id = VALUES(lesson_id)
    ");
    $stmt->execute(['lesson_id' => $lessonId]);

    $session = classroomGetSession($pdo, $lessonId, true);

    if (!$session) {
        throw new RuntimeException('Не удалось создать сессию урока');
    }

    return $session;
}

function classroomStorageDate(string $value): ?DateTimeImmutable
{
    $date = DateTimeImmutable::createFromFormat(
        '!Y-m-d H:i:s',
        $value,
        lessonPlatformTimezone()
    );

    return $date ?: null;
}

function classroomAccess(
    array $lesson,
    ?array $session,
    array $user
): array {
    $now = new DateTimeImmutable('now', lessonPlatformTimezone());
    $lessonStart = classroomStorageDate((string) $lesson['lesson_date']);

    if (!$lessonStart) {
        throw new RuntimeException('У урока указана некорректная дата');
    }

    $lessonEnd = $lessonStart->modify(
        '+' . max(1, (int) $lesson['duration_minutes']) . ' minutes'
    );
    $availableAt = $lessonStart->modify(
        '-' . CLASSROOM_ENTRY_ADVANCE_MINUTES . ' minutes'
    );
    $startDeadline = $lessonEnd->modify(
        '+' . CLASSROOM_START_GRACE_MINUTES . ' minutes'
    );
    $lessonStatus = (string) $lesson['status'];
    $sessionStatus = $session['status'] ?? (
        $lessonStatus === 'completed' ? 'ended' : 'waiting'
    );
    $reason = null;
    $canJoin = false;

    if ($lessonStatus === 'cancelled') {
        $reason = 'Урок отменён';
    } elseif ($lessonStatus === 'completed' || $sessionStatus === 'ended') {
        $sessionStatus = 'ended';
        $reason = 'Урок завершён';
    } elseif ($sessionStatus === 'active') {
        $canJoin = true;
    } elseif ($now < $availableAt) {
        $reason = 'Вход откроется за 15 минут до начала урока';
    } elseif ($now > $startDeadline) {
        $reason = 'Время входа в класс закончилось';
    } elseif (in_array($lessonStatus, ['scheduled', 'rescheduled'], true)) {
        $canJoin = true;
    } else {
        $reason = 'Класс для этого урока недоступен';
    }

    $isTeacher = ($user['role'] ?? null) === 'teacher';

    return [
        'can_join' => $canJoin,
        'can_start' => $canJoin && $isTeacher && $sessionStatus === 'waiting',
        'can_finish' => $isTeacher && $sessionStatus === 'active',
        'can_chat' => $canJoin && in_array($sessionStatus, ['waiting', 'active'], true),
        'can_manage_files' => $canJoin && $isTeacher && $sessionStatus !== 'ended',
        'can_share_material' => $canJoin
            && $isTeacher
            && $sessionStatus === 'active',
        'is_read_only' => !$canJoin || $sessionStatus === 'ended',
        'reason' => $reason,
        'available_at' => $availableAt->format('Y-m-d H:i:s'),
        'scheduled_end_at' => $lessonEnd->format('Y-m-d H:i:s'),
        'start_deadline_at' => $startDeadline->format('Y-m-d H:i:s'),
        'entry_advance_minutes' => CLASSROOM_ENTRY_ADVANCE_MINUTES,
    ];
}

function classroomAccessResponse(
    array $access,
    DateTimeZone $viewerTimezone
): array {
    foreach (['available_at', 'scheduled_end_at', 'start_deadline_at'] as $key) {
        $access[$key] = lessonFromStorageDateTime(
            $access[$key] ?? null,
            $viewerTimezone
        );
    }

    return $access;
}

function classroomTouchPresence(
    PDO $pdo,
    int $lessonId,
    string $role
): void {
    $joinedColumn = $role === 'teacher'
        ? 'teacher_joined_at'
        : 'student_joined_at';
    $seenColumn = $role === 'teacher'
        ? 'teacher_last_seen_at'
        : 'student_last_seen_at';
    $stmt = $pdo->prepare("
        UPDATE lesson_sessions
        SET
            {$joinedColumn} = COALESCE({$joinedColumn}, CURRENT_TIMESTAMP),
            {$seenColumn} = CURRENT_TIMESTAMP
        WHERE lesson_id = :lesson_id
          AND status <> 'ended'
    ");
    $stmt->execute(['lesson_id' => $lessonId]);
}

function classroomIsPresent(?string $lastSeenAt): bool
{
    if ($lastSeenAt === null || trim($lastSeenAt) === '') {
        return false;
    }

    $lastSeen = classroomStorageDate($lastSeenAt);

    return $lastSeen !== null
        && $lastSeen >= new DateTimeImmutable(
            '-' . CLASSROOM_PRESENCE_TIMEOUT_SECONDS . ' seconds',
            lessonPlatformTimezone()
        );
}

function classroomSessionResponse(
    ?array $session,
    array $lesson,
    DateTimeZone $viewerTimezone
): array {
    $status = $session['status'] ?? (
        $lesson['status'] === 'completed' ? 'ended' : 'waiting'
    );
    $startedAt = $session['started_at'] ?? null;
    $endedAt = $session['ended_at'] ?? null;
    $elapsedSeconds = 0;

    if ($startedAt !== null) {
        $started = classroomStorageDate((string) $startedAt);
        $elapsedEnd = $endedAt !== null
            ? classroomStorageDate((string) $endedAt)
            : new DateTimeImmutable('now', lessonPlatformTimezone());

        if ($started && $elapsedEnd) {
            $elapsedSeconds = max(0, $elapsedEnd->getTimestamp() - $started->getTimestamp());
        }
    }

    return [
        'id' => isset($session['id']) ? (int) $session['id'] : null,
        'status' => $status,
        'started_at' => lessonFromStorageDateTime($startedAt, $viewerTimezone),
        'ended_at' => lessonFromStorageDateTime($endedAt, $viewerTimezone),
        'elapsed_seconds' => $elapsedSeconds,
        'teacher_present' => $status !== 'ended'
            && classroomIsPresent($session['teacher_last_seen_at'] ?? null),
        'student_present' => $status !== 'ended'
            && classroomIsPresent($session['student_last_seen_at'] ?? null),
    ];
}

function classroomLessonResponse(
    array $lesson,
    DateTimeZone $viewerTimezone
): array {
    return [
        'id' => (int) $lesson['id'],
        'teacher_id' => (int) $lesson['teacher_id'],
        'student_id' => (int) $lesson['student_id'],
        'subject_id' => $lesson['subject_id'] === null
            ? null
            : (int) $lesson['subject_id'],
        'relation_id' => $lesson['relation_id'] === null
            ? null
            : (int) $lesson['relation_id'],
        'title' => (string) $lesson['title'],
        'topic' => trim((string) ($lesson['lesson_topic'] ?? '')) !== ''
            ? (string) $lesson['lesson_topic']
            : (string) $lesson['title'],
        'subject_name' => (string) ($lesson['subject_name'] ?? $lesson['title']),
        'lesson_date' => lessonFromStorageDateTime(
            $lesson['lesson_date'],
            $viewerTimezone
        ),
        'duration_minutes' => (int) $lesson['duration_minutes'],
        'status' => (string) $lesson['status'],
        'teacher' => [
            'id' => (int) $lesson['teacher_id'],
            'name' => (string) $lesson['teacher_name'],
            'avatar_url' => $lesson['teacher_avatar_url'] ?? null,
        ],
        'student' => [
            'id' => (int) $lesson['student_id'],
            'name' => (string) $lesson['student_name'],
            'avatar_url' => $lesson['student_avatar_url'] ?? null,
        ],
    ];
}

function classroomMessageResponse(
    array $message,
    DateTimeZone $viewerTimezone,
    int $viewerId
): array {
    return [
        'id' => (int) $message['id'],
        'sender_id' => (int) $message['sender_id'],
        'sender_name' => (string) $message['sender_name'],
        'sender_role' => (string) $message['sender_role'],
        'text' => (string) $message['message_text'],
        'created_at' => lessonFromStorageDateTime(
            $message['created_at'],
            $viewerTimezone
        ),
        'is_own' => (int) $message['sender_id'] === $viewerId,
    ];
}

function classroomLoadMessages(
    PDO $pdo,
    int $lessonId,
    DateTimeZone $viewerTimezone,
    int $viewerId,
    int $afterId = 0,
    int $limit = CLASSROOM_INITIAL_MESSAGE_LIMIT
): array {
    if ($afterId > 0) {
        $stmt = $pdo->prepare("
            SELECT
                lm.id,
                lm.sender_id,
                lm.message_text,
                lm.created_at,
                senders.full_name AS sender_name,
                senders.role AS sender_role
            FROM lesson_messages lm
            INNER JOIN users senders ON senders.id = lm.sender_id
            WHERE lm.lesson_id = :lesson_id
              AND lm.id > :after_id
            ORDER BY lm.id ASC
            LIMIT :message_limit
        ");
        $stmt->bindValue(':lesson_id', $lessonId, PDO::PARAM_INT);
        $stmt->bindValue(':after_id', $afterId, PDO::PARAM_INT);
        $stmt->bindValue(':message_limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $stmt = $pdo->prepare("
            SELECT *
            FROM (
                SELECT
                    lm.id,
                    lm.sender_id,
                    lm.message_text,
                    lm.created_at,
                    senders.full_name AS sender_name,
                    senders.role AS sender_role
                FROM lesson_messages lm
                INNER JOIN users senders ON senders.id = lm.sender_id
                WHERE lm.lesson_id = :lesson_id
                ORDER BY lm.id DESC
                LIMIT :message_limit
            ) recent_messages
            ORDER BY id ASC
        ");
        $stmt->bindValue(':lesson_id', $lessonId, PDO::PARAM_INT);
        $stmt->bindValue(':message_limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    return array_map(
        static fn (array $row): array => classroomMessageResponse(
            $row,
            $viewerTimezone,
            $viewerId
        ),
        $rows
    );
}

function classroomLoadFiles(
    PDO $pdo,
    int $lessonId,
    DateTimeZone $viewerTimezone
): array {
    $stmt = $pdo->prepare("
        SELECT id, original_name, mime_type, file_size, created_at
        FROM lesson_files
        WHERE lesson_id = :lesson_id
        ORDER BY id ASC
    ");
    $stmt->execute(['lesson_id' => $lessonId]);

    return array_map(static fn (array $file): array => [
        'id' => (int) $file['id'],
        'original_name' => (string) $file['original_name'],
        'mime_type' => (string) $file['mime_type'],
        'file_size' => (int) $file['file_size'],
        'created_at' => lessonFromStorageDateTime(
            $file['created_at'],
            $viewerTimezone
        ),
    ], $stmt->fetchAll(PDO::FETCH_ASSOC));
}

function classroomGetWorkspaceState(
    PDO $pdo,
    int $lessonId,
    bool $forUpdate = false
): ?array {
    $lock = $forUpdate ? ' FOR UPDATE' : '';
    $stmt = $pdo->prepare("
        SELECT
            lws.lesson_id,
            lws.is_sharing,
            lws.shared_file_id,
            lws.shared_page,
            lws.updated_by,
            lws.version,
            lws.updated_at
        FROM lesson_workspace_state lws
        WHERE lws.lesson_id = :lesson_id
        LIMIT 1{$lock}
    ");
    $stmt->execute(['lesson_id' => $lessonId]);
    $workspace = $stmt->fetch(PDO::FETCH_ASSOC);

    return $workspace ?: null;
}

function classroomEnsureWorkspaceState(PDO $pdo, int $lessonId): array
{
    $stmt = $pdo->prepare("
        INSERT INTO lesson_workspace_state (lesson_id)
        VALUES (:lesson_id)
        ON DUPLICATE KEY UPDATE lesson_id = VALUES(lesson_id)
    ");
    $stmt->execute(['lesson_id' => $lessonId]);
    $workspace = classroomGetWorkspaceState($pdo, $lessonId, true);

    if (!$workspace) {
        throw new RuntimeException('Не удалось создать состояние рабочего экрана');
    }

    return $workspace;
}

function classroomWorkspaceResponse(?array $workspace): array
{
    $sharedFileId = isset($workspace['shared_file_id'])
        ? (int) $workspace['shared_file_id']
        : null;
    $isSharing = (bool) ($workspace['is_sharing'] ?? false)
        && $sharedFileId !== null;

    return [
        'is_sharing' => $isSharing,
        'file_id' => $isSharing ? $sharedFileId : null,
        'page' => $isSharing
            ? max(1, (int) ($workspace['shared_page'] ?? 1))
            : 1,
        'version' => (int) ($workspace['version'] ?? 0),
        'updated_at' => $workspace['updated_at'] ?? null,
    ];
}

function classroomLoadHomework(
    PDO $pdo,
    int $lessonId,
    DateTimeZone $viewerTimezone
): array {
    $stmt = $pdo->prepare("
        SELECT id, title, description, due_date, status, created_at
        FROM homework
        WHERE lesson_id = :lesson_id
          AND status <> 'cancelled'
        ORDER BY id DESC
    ");
    $stmt->execute(['lesson_id' => $lessonId]);

    return array_map(static fn (array $homework): array => [
        'id' => (int) $homework['id'],
        'title' => (string) $homework['title'],
        'description' => (string) $homework['description'],
        'due_date' => lessonFromStorageDateTime(
            $homework['due_date'],
            $viewerTimezone
        ),
        'status' => (string) $homework['status'],
        'created_at' => lessonFromStorageDateTime(
            $homework['created_at'],
            $viewerTimezone
        ),
    ], $stmt->fetchAll(PDO::FETCH_ASSOC));
}

function classroomLoadTeacherNote(PDO $pdo, int $lessonId): string
{
    $stmt = $pdo->prepare("
        SELECT teacher_note
        FROM lesson_results
        WHERE lesson_id = :lesson_id
        LIMIT 1
    ");
    $stmt->execute(['lesson_id' => $lessonId]);

    return (string) ($stmt->fetchColumn() ?: '');
}

function classroomAllowedMimeTypes(): array
{
    return [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'text/plain' => 'txt',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel' => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        'application/vnd.ms-powerpoint' => 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
    ];
}

function classroomUploadLimits(): array
{
    return [
        'max_files' => CLASSROOM_MAX_FILES_PER_UPLOAD,
        'max_file_bytes' => effectiveUploadMaxBytes(
            'UPLOAD_CLASSROOM_MAX_BYTES',
            10 * 1024 * 1024
        ),
        'max_total_bytes' => effectivePostMaxBytes(
            'UPLOAD_CLASSROOM_TOTAL_MAX_BYTES',
            30 * 1024 * 1024
        ),
        'lesson_max_bytes' => uploadMaxBytes(
            'UPLOAD_CLASSROOM_LESSON_MAX_BYTES',
            100 * 1024 * 1024
        ),
    ];
}

function classroomReceiveFiles(): array
{
    $limits = classroomUploadLimits();

    return receiveUploadedFiles(
        'files',
        $limits['max_files'],
        $limits['max_file_bytes'],
        $limits['max_total_bytes'],
        classroomAllowedMimeTypes()
    );
}

function classroomValidateMultipartRequestSize(): void
{
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    $maxBytes = classroomUploadLimits()['max_total_bytes'];

    if ($contentLength > 0 && $contentLength > $maxBytes) {
        errorResponse(
            'Общий размер файлов превышает '
                . round($maxBytes / 1024 / 1024, 1)
                . ' МБ',
            413
        );
    }
}
