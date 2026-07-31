<?php

declare(strict_types=1);

require_once __DIR__ . '/lesson-time.php';

const JOURNAL_ATTENDANCE_VALUES = ['present', 'absent', 'late'];
const JOURNAL_GRADE_VALUES = ['2', '3', '4', '5', 'pass'];
const JOURNAL_PAGE_SIZE = 30;
const JOURNAL_MAX_PAGE_SIZE = 50;

function journalParseOptionalPositiveId(
    mixed $value,
    string $label
): ?int {
    if ($value === null || $value === '') {
        return null;
    }

    $id = filter_var(
        $value,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($id === false) {
        throw new InvalidArgumentException("Некорректно указан {$label}");
    }

    return (int) $id;
}

function journalParsePositiveId(mixed $value, string $label): int
{
    $id = journalParseOptionalPositiveId($value, $label);

    if ($id === null) {
        throw new InvalidArgumentException("Не указан {$label}");
    }

    return $id;
}

function journalParseLimit(mixed $value): int
{
    $limit = filter_var(
        $value ?? JOURNAL_PAGE_SIZE,
        FILTER_VALIDATE_INT,
        ['options' => [
            'min_range' => 1,
            'max_range' => JOURNAL_MAX_PAGE_SIZE,
        ]]
    );

    if ($limit === false) {
        throw new InvalidArgumentException('Некорректный размер страницы');
    }

    return (int) $limit;
}

function journalParseCursor(
    mixed $dateValue,
    mixed $idValue
): ?array {
    $date = trim((string) ($dateValue ?? ''));
    $id = journalParseOptionalPositiveId($idValue, 'указатель страницы');

    if ($date === '' && $id === null) {
        return null;
    }

    if ($date === '' || $id === null) {
        throw new InvalidArgumentException('Некорректный указатель страницы');
    }

    $parsedDate = DateTimeImmutable::createFromFormat(
        '!Y-m-d H:i:s',
        $date,
        lessonPlatformTimezone()
    );

    if (!$parsedDate || $parsedDate->format('Y-m-d H:i:s') !== $date) {
        throw new InvalidArgumentException('Некорректная дата указателя страницы');
    }

    return [
        'date' => $date,
        'id' => $id,
    ];
}

function journalNormalizeLesson(
    array $row,
    DateTimeZone $viewerTimezone,
    bool $includePrivateNote = false
): array {
    $lesson = [
        'id' => (int) $row['lesson_id'],
        'teacher_id' => (int) $row['teacher_id'],
        'student_id' => (int) $row['student_id'],
        'subject_id' => (int) $row['subject_id'],
        'student_name' => $row['student_name'] ?? null,
        'teacher_name' => $row['teacher_name'] ?? null,
        'subject_name' => $row['subject_name'] ?? null,
        'lesson_date' => lessonFromStorageDateTime(
            $row['lesson_date'] ?? null,
            $viewerTimezone
        ),
        'duration_minutes' => (int) $row['duration_minutes'],
        'status' => $row['lesson_status'],
        'topic' => trim((string) ($row['lesson_topic'] ?? '')) !== ''
            ? $row['lesson_topic']
            : $row['lesson_title'],
        'lesson_notes' => $row['lesson_notes'] ?? null,
        'attendance' => $row['attendance'] ?? null,
        'grade' => $row['grade'] ?? null,
        'lesson_result' => $row['lesson_result'] ?? null,
        'teacher_comment' => $row['teacher_comment'] ?? null,
        'published_at' => $row['published_at'] ?? null,
        'is_published' => $row['published_at'] !== null,
        'homework_count' => (int) ($row['homework_count'] ?? 0),
        'latest_homework_id' => isset($row['latest_homework_id'])
            ? (int) $row['latest_homework_id']
            : null,
        'latest_homework_title' => $row['latest_homework_title'] ?? null,
        'latest_homework_status' => $row['latest_homework_status'] ?? null,
    ];

    if ($includePrivateNote) {
        $lesson['teacher_note'] = $row['teacher_note'] ?? null;
    }

    return $lesson;
}

function journalLessonSelect(): string
{
    return "
        SELECT
            l.id AS lesson_id,
            l.teacher_id,
            l.student_id,
            l.subject_id,
            l.title AS lesson_title,
            l.lesson_date,
            l.duration_minutes,
            l.status AS lesson_status,
            l.lesson_topic,
            l.lesson_notes,
            students.full_name AS student_name,
            teachers.full_name AS teacher_name,
            subjects.name AS subject_name,
            lr.attendance,
            lr.grade,
            lr.lesson_result,
            lr.teacher_comment,
            lr.teacher_note,
            lr.published_at,
            (
                SELECT COUNT(*)
                FROM homework homework_count_source
                WHERE homework_count_source.lesson_id = l.id
                  AND homework_count_source.status <> 'cancelled'
            ) AS homework_count,
            latest_homework.id AS latest_homework_id,
            latest_homework.title AS latest_homework_title,
            latest_homework.status AS latest_homework_status
        FROM lessons l
        INNER JOIN users students
            ON students.id = l.student_id
        INNER JOIN users teachers
            ON teachers.id = l.teacher_id
        INNER JOIN subjects
            ON subjects.id = l.subject_id
        LEFT JOIN lesson_results lr
            ON lr.lesson_id = l.id
        LEFT JOIN homework latest_homework
            ON latest_homework.id = (
                SELECT MAX(homework_latest_source.id)
                FROM homework homework_latest_source
                WHERE homework_latest_source.lesson_id = l.id
                  AND homework_latest_source.status <> 'cancelled'
            )
    ";
}
