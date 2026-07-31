<?php

declare(strict_types=1);

require_once __DIR__ . '/lesson-time.php';

function lessonGetViewerTimezone(
    PDO $pdo,
    array $user
): DateTimeZone {
    $profileTable = $user['role'] === 'teacher'
        ? 'teacher_profiles'
        : 'student_profiles';

    $stmt = $pdo->prepare("
        SELECT timezone
        FROM {$profileTable}
        WHERE user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'user_id' => $user['id'],
    ]);

    return lessonResolveTimezone($stmt->fetchColumn() ?: null);
}

function lessonFindScheduleConflict(
    PDO $pdo,
    int $teacherId,
    int $studentId,
    string $storageStart,
    string $storageEnd,
    ?int $excludedLessonId = null
): ?array {
    $excludeSql = $excludedLessonId === null
        ? ''
        : 'AND l.id <> :excluded_lesson_id';

    $stmt = $pdo->prepare("
        SELECT
            l.id,
            l.teacher_id,
            l.student_id,
            l.lesson_date,
            l.duration_minutes
        FROM lessons l
        WHERE l.status IN ('scheduled', 'rescheduled')
          AND l.lesson_date < :new_lesson_end
          AND DATE_ADD(
              l.lesson_date,
              INTERVAL l.duration_minutes MINUTE
          ) > :new_lesson_start
          AND (
              l.teacher_id = :conflict_teacher_id
              OR l.student_id = :conflict_student_id
          )
          {$excludeSql}
        LIMIT 1
        FOR UPDATE
    ");

    $parameters = [
        'new_lesson_end' => $storageEnd,
        'new_lesson_start' => $storageStart,
        'conflict_teacher_id' => $teacherId,
        'conflict_student_id' => $studentId,
    ];

    if ($excludedLessonId !== null) {
        $parameters['excluded_lesson_id'] = $excludedLessonId;
    }

    $stmt->execute($parameters);

    $conflict = $stmt->fetch(PDO::FETCH_ASSOC);

    return $conflict ?: null;
}

function lessonConflictMessage(
    array $conflict,
    int $teacherId
): string {
    return (int) $conflict['teacher_id'] === $teacherId
        ? 'У преподавателя уже есть занятие, пересекающееся по времени'
        : 'У ученика уже есть занятие, пересекающееся по времени';
}

function lessonLoadParticipantForUpdate(
    PDO $pdo,
    int $lessonId,
    array $user
): ?array {
    $stmt = $pdo->prepare("
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
            students.full_name AS student_name,
            subjects.name AS subject_name
        FROM lessons l
        INNER JOIN users teachers
            ON teachers.id = l.teacher_id
        INNER JOIN users students
            ON students.id = l.student_id
        LEFT JOIN subjects
            ON subjects.id = l.subject_id
        WHERE l.id = :lesson_id
          AND (
              l.teacher_id = :teacher_user_id
              OR l.student_id = :student_user_id
          )
        LIMIT 1
        FOR UPDATE
    ");

    $stmt->execute([
        'lesson_id' => $lessonId,
        'teacher_user_id' => $user['id'],
        'student_user_id' => $user['id'],
    ]);

    $lesson = $stmt->fetch(PDO::FETCH_ASSOC);

    return $lesson ?: null;
}

function lessonCanBeChanged(array $lesson): bool
{
    if (!in_array(
        $lesson['status'] ?? null,
        ['scheduled', 'rescheduled'],
        true
    )) {
        return false;
    }

    $lessonDate = DateTimeImmutable::createFromFormat(
        '!Y-m-d H:i:s',
        (string) ($lesson['lesson_date'] ?? ''),
        lessonPlatformTimezone()
    );

    if (!$lessonDate) {
        return false;
    }

    return $lessonDate > new DateTimeImmutable(
        'now',
        lessonPlatformTimezone()
    );
}

function lessonChangeRequestResponse(
    array $request,
    DateTimeZone $viewerTimezone,
    int $viewerId
): array {
    $requestedBy = (int) ($request['requested_by'] ?? 0);

    return [
        'id' => (int) $request['id'],
        'lesson_id' => (int) $request['lesson_id'],
        'requested_by' => $requestedBy,
        'requested_role' => $request['requested_role'],
        'requester_name' => $request['requester_name'] ?? null,
        'request_type' => $request['request_type'],
        'status' => $request['status'],
        'original_lesson_date' => lessonFromStorageDateTime(
            $request['original_lesson_date'] ?? null,
            $viewerTimezone
        ),
        'proposed_lesson_date' => lessonFromStorageDateTime(
            $request['proposed_lesson_date'] ?? null,
            $viewerTimezone
        ),
        'request_comment' => $request['request_comment'],
        'response_comment' => $request['response_comment'] ?? null,
        'responded_by' => isset($request['responded_by'])
            ? (int) $request['responded_by']
            : null,
        'responded_at' => lessonFromStorageDateTime(
            $request['responded_at'] ?? null,
            $viewerTimezone
        ),
        'created_at' => lessonFromStorageDateTime(
            $request['created_at'] ?? null,
            $viewerTimezone
        ),
        'can_respond' => $request['status'] === 'pending'
            && $requestedBy !== $viewerId,
        'can_withdraw' => $request['status'] === 'pending'
            && $requestedBy === $viewerId,
    ];
}
