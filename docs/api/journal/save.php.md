<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/journal.php';
require_once __DIR__ . '/../shared/notifications.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Заполнять журнал может только преподаватель', 403);
}

$data = getJsonInput();

try {
    $lessonId = journalParsePositiveId($data['lesson_id'] ?? null, 'урок');
} catch (InvalidArgumentException $error) {
    errorResponse($error->getMessage());
}

$attendance = trim((string) ($data['attendance'] ?? ''));
$grade = trim((string) ($data['grade'] ?? ''));
$lessonResult = trim((string) ($data['lesson_result'] ?? ''));
$teacherComment = trim((string) ($data['teacher_comment'] ?? ''));
$teacherNote = trim((string) ($data['teacher_note'] ?? ''));

if (!in_array($attendance, JOURNAL_ATTENDANCE_VALUES, true)) {
    errorResponse('Выберите посещаемость');
}

if ($grade !== '' && !in_array($grade, JOURNAL_GRADE_VALUES, true)) {
    errorResponse('Выберите допустимую оценку');
}

if ($attendance === 'absent' && $grade !== '') {
    errorResponse('Отсутствующему ученику нельзя поставить оценку');
}

if ($attendance !== 'absent' && $lessonResult === '') {
    errorResponse('Опишите результат занятия');
}

if (
    mb_strlen($lessonResult) > 5000
    || mb_strlen($teacherComment) > 5000
    || mb_strlen($teacherNote) > 5000
) {
    errorResponse('Один из комментариев превышает 5000 символов');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $lessonStmt = $pdo->prepare("
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
            students.full_name AS student_name,
            subjects.name AS subject_name,
            lr.published_at
        FROM lessons l
        INNER JOIN users students
            ON students.id = l.student_id
        INNER JOIN subjects
            ON subjects.id = l.subject_id
        LEFT JOIN lesson_results lr
            ON lr.lesson_id = l.id
        WHERE l.id = :lesson_id
          AND l.teacher_id = :teacher_id
        LIMIT 1
        FOR UPDATE
    ");
    $lessonStmt->execute([
        'lesson_id' => $lessonId,
        'teacher_id' => (int) $user['id'],
    ]);
    $lesson = $lessonStmt->fetch(PDO::FETCH_ASSOC);

    if (!$lesson) {
        errorResponse('Урок не найден', 404);
    }

    if (!in_array($lesson['status'], ['scheduled', 'rescheduled', 'completed'], true)) {
        errorResponse('Для отменённого урока нельзя заполнить журнал', 409);
    }

    $lessonStart = DateTimeImmutable::createFromFormat(
        '!Y-m-d H:i:s',
        (string) $lesson['lesson_date'],
        lessonPlatformTimezone()
    );
    $lessonEnd = $lessonStart?->modify(
        '+' . (int) $lesson['duration_minutes'] . ' minutes'
    );

    if (
        !$lessonEnd
        || (
            $lesson['status'] !== 'completed'
            && $lessonEnd > new DateTimeImmutable(
                'now',
                lessonPlatformTimezone()
            )
        )
    ) {
        errorResponse('Результат можно опубликовать только после окончания урока', 409);
    }

    $wasPublished = $lesson['published_at'] !== null;
    $saveStmt = $pdo->prepare("
        INSERT INTO lesson_results (
            lesson_id,
            attendance,
            grade,
            lesson_result,
            teacher_comment,
            teacher_note,
            published_at
        ) VALUES (
            :lesson_id,
            :attendance,
            :grade,
            :lesson_result,
            :teacher_comment,
            :teacher_note,
            CURRENT_TIMESTAMP
        )
        ON DUPLICATE KEY UPDATE
            attendance = VALUES(attendance),
            grade = VALUES(grade),
            lesson_result = VALUES(lesson_result),
            teacher_comment = VALUES(teacher_comment),
            teacher_note = VALUES(teacher_note),
            published_at = COALESCE(published_at, CURRENT_TIMESTAMP)
    ");
    $saveStmt->execute([
        'lesson_id' => $lessonId,
        'attendance' => $attendance,
        'grade' => $grade !== '' ? $grade : null,
        'lesson_result' => $lessonResult !== '' ? $lessonResult : null,
        'teacher_comment' => $teacherComment !== '' ? $teacherComment : null,
        'teacher_note' => $teacherNote !== '' ? $teacherNote : null,
    ]);

    $completeStmt = $pdo->prepare("
        UPDATE lessons
        SET status = 'completed'
        WHERE id = :lesson_id
          AND status IN ('scheduled', 'rescheduled')
    ");
    $completeStmt->execute([
        'lesson_id' => $lessonId,
    ]);

    notificationCreate(
        $pdo,
        (int) $lesson['student_id'],
        $wasPublished ? 'lesson_result_updated' : 'lesson_result_published',
        $wasPublished
            ? 'Результат занятия обновлён'
            : 'Результат занятия опубликован',
        $lesson['subject_name'] . ': ' . (
            trim((string) $lesson['lesson_topic']) !== ''
                ? $lesson['lesson_topic']
                : $lesson['title']
        ),
        NOTIFICATION_SECTION_DIARY,
        'lesson',
        $lessonId,
        notificationLessonTargetDateForUser(
            $pdo,
            (int) $lesson['student_id'],
            'student',
            $lesson['lesson_date']
        ),
        'lesson-result:' . $lessonId
    );

    $pdo->commit();

    successResponse([
        'message' => $wasPublished
            ? 'Запись журнала обновлена'
            : 'Результат занятия опубликован',
        'lesson_id' => $lessonId,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('journal/save.php: ' . $error->getMessage());
    errorResponse('Не удалось сохранить запись журнала', 500);
}
