<?php

declare(strict_types=1);

require_once __DIR__ . '/lesson-time.php';

const NOTIFICATION_SECTION_SCHEDULE = 'schedule';
const NOTIFICATION_SECTION_STUDENTS = 'students';
const NOTIFICATION_SECTION_TEACHERS = 'teachers';
const NOTIFICATION_SECTION_MESSAGES = 'messages';
const NOTIFICATION_SECTION_HOMEWORK = 'homework';
const NOTIFICATION_SECTION_DIARY = 'diary';

function notificationCreate(
    PDO $pdo,
    int $userId,
    string $type,
    string $title,
    string $message,
    ?string $targetSection = null,
    ?string $targetEntityType = null,
    ?int $targetEntityId = null,
    ?string $targetDate = null,
    ?string $dedupeKey = null
): int {
    if ($userId <= 0) {
        throw new InvalidArgumentException('Не указан получатель уведомления');
    }

    $type = trim($type);
    $title = trim($title);
    $message = trim($message);
    $dedupeKey = $dedupeKey !== null ? trim($dedupeKey) : null;

    if ($type === '' || $title === '' || $message === '') {
        throw new InvalidArgumentException('Уведомление заполнено не полностью');
    }

    if (
        mb_strlen($type) > 64
        || mb_strlen($title) > 160
        || mb_strlen($message) > 500
        || ($dedupeKey !== null && mb_strlen($dedupeKey) > 190)
    ) {
        throw new InvalidArgumentException('Уведомление превышает допустимую длину');
    }

    $insertMode = $dedupeKey === null ? 'INSERT' : 'REPLACE';
    $stmt = $pdo->prepare("
        {$insertMode} INTO notifications (
            user_id,
            type,
            dedupe_key,
            title,
            message,
            target_section,
            target_entity_type,
            target_entity_id,
            target_date
        ) VALUES (
            :user_id,
            :type,
            :dedupe_key,
            :title,
            :message,
            :target_section,
            :target_entity_type,
            :target_entity_id,
            :target_date
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'type' => $type,
        'dedupe_key' => $dedupeKey,
        'title' => $title,
        'message' => $message,
        'target_section' => $targetSection,
        'target_entity_type' => $targetEntityType,
        'target_entity_id' => $targetEntityId,
        'target_date' => $targetDate,
    ]);

    return (int) $pdo->lastInsertId();
}

function notificationUnreadCount(PDO $pdo, int $userId): int
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM notifications
        WHERE user_id = :user_id
          AND is_read = 0
    ");
    $stmt->execute([
        'user_id' => $userId,
    ]);

    return (int) $stmt->fetchColumn();
}

function notificationLessonRecipient(array $lesson, int $actorId): int
{
    $teacherId = (int) ($lesson['teacher_id'] ?? 0);
    $studentId = (int) ($lesson['student_id'] ?? 0);

    if ($actorId === $teacherId) {
        return $studentId;
    }

    if ($actorId === $studentId) {
        return $teacherId;
    }

    throw new InvalidArgumentException('Пользователь не является участником урока');
}

function notificationLessonTargetDateForUser(
    PDO $pdo,
    int $userId,
    string $role,
    ?string $storageDate
): ?string {
    if (!$storageDate) {
        return null;
    }

    if (!in_array($role, ['student', 'teacher'], true)) {
        throw new InvalidArgumentException('Некорректная роль получателя');
    }

    $profileTable = $role === 'teacher'
        ? 'teacher_profiles'
        : 'student_profiles';

    $stmt = $pdo->prepare("
        SELECT timezone
        FROM {$profileTable}
        WHERE user_id = :user_id
        LIMIT 1
    ");
    $stmt->execute([
        'user_id' => $userId,
    ]);

    $localDate = lessonFromStorageDateTime(
        $storageDate,
        lessonResolveTimezone($stmt->fetchColumn() ?: null)
    );

    return $localDate ? substr($localDate, 0, 10) : null;
}

function notificationMarkEntityRead(
    PDO $pdo,
    int $userId,
    string $entityType,
    int $entityId
): int {
    $stmt = $pdo->prepare("
        UPDATE notifications
        SET is_read = 1,
            read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
        WHERE user_id = :user_id
          AND target_entity_type = :entity_type
          AND target_entity_id = :entity_id
          AND is_read = 0
    ");

    $stmt->execute([
        'user_id' => $userId,
        'entity_type' => $entityType,
        'entity_id' => $entityId,
    ]);

    return $stmt->rowCount();
}
