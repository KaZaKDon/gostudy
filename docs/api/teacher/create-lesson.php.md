<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/lesson-time.php';
require_once __DIR__ . '/../shared/lesson-management.php';
require_once __DIR__ . '/../shared/notifications.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Назначать уроки может только преподаватель', 403);
}

$data = getJsonInput();

$relationId = filter_var(
    $data['relation_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);
$durationMinutes = filter_var(
    $data['duration_minutes'] ?? null,
    FILTER_VALIDATE_INT
);
$lessonDateInput = trim((string) ($data['lesson_date'] ?? ''));
$lessonTopic = trim((string) ($data['lesson_topic'] ?? ''));
$lessonNotes = trim((string) ($data['lesson_notes'] ?? ''));

if ($relationId === false) {
    errorResponse('Выберите ученика и предмет');
}

if (!in_array($durationMinutes, [45, 60, 90], true)) {
    errorResponse('Выберите доступную продолжительность урока');
}

if ($lessonTopic === '') {
    errorResponse('Укажите тему урока');
}

if (mb_strlen($lessonTopic) > 255) {
    errorResponse('Тема урока не должна превышать 255 символов');
}

if (mb_strlen($lessonNotes) > 10000) {
    errorResponse('Комментарий к уроку слишком длинный');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $relationStmt = $pdo->prepare("
        SELECT
            ts.student_id,
            ts.subject_id,
            students.full_name AS student_name,
            subjects.name AS subject_name,
            tp.timezone,
            tp.price_45,
            tp.price_60,
            tp.price_90
        FROM teacher_students ts
        INNER JOIN users students
            ON students.id = ts.student_id
           AND students.role = 'student'
           AND students.status = 'active'
        INNER JOIN subjects
            ON subjects.id = ts.subject_id
           AND subjects.is_active = 1
        INNER JOIN teacher_profiles tp
            ON tp.user_id = ts.teacher_id
        WHERE ts.id = :relation_id
          AND ts.teacher_id = :teacher_id
          AND ts.status = 'active'
        LIMIT 1
        FOR UPDATE
    ");

    $relationStmt->execute([
        'relation_id' => $relationId,
        'teacher_id' => $user['id'],
    ]);

    $relation = $relationStmt->fetch(PDO::FETCH_ASSOC);

    if (!$relation) {
        errorResponse('Активная связь с учеником не найдена', 404);
    }

    $durationPrice = $relation['price_' . $durationMinutes] ?? null;

    if ($durationPrice === null || (float) $durationPrice <= 0) {
        errorResponse('Эта продолжительность не включена в анкете преподавателя');
    }

    $teacherTimezone = lessonResolveTimezone(
        $relation['timezone'] ?? null
    );
    $lessonDate = lessonParseLocalDateTime(
        $lessonDateInput,
        $teacherTimezone
    );

    if (!$lessonDate) {
        errorResponse('Укажите корректные дату и время урока');
    }

    $now = new DateTimeImmutable('now', $teacherTimezone);

    if ($lessonDate <= $now) {
        errorResponse('Урок можно назначить только на будущее время');
    }

    if ($lessonDate > $now->modify('+1 year')) {
        errorResponse('Урок нельзя назначить более чем на год вперёд');
    }

    $lessonEnd = $lessonDate->modify('+' . $durationMinutes . ' minutes');
    $storageStart = lessonToStorageDateTime($lessonDate);
    $storageEnd = lessonToStorageDateTime($lessonEnd);

    $conflict = lessonFindScheduleConflict(
        $pdo,
        (int) $user['id'],
        (int) $relation['student_id'],
        $storageStart,
        $storageEnd
    );

    if ($conflict) {
        errorResponse(
            lessonConflictMessage($conflict, (int) $user['id']),
            409
        );
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO lessons (
            teacher_id,
            student_id,
            subject_id,
            title,
            lesson_date,
            duration_minutes,
            status,
            lesson_topic,
            lesson_notes
        ) VALUES (
            :teacher_id,
            :student_id,
            :subject_id,
            :title,
            :lesson_date,
            :duration_minutes,
            'scheduled',
            :lesson_topic,
            :lesson_notes
        )
    ");

    $insertStmt->execute([
        'teacher_id' => $user['id'],
        'student_id' => $relation['student_id'],
        'subject_id' => $relation['subject_id'],
        'title' => $relation['subject_name'],
        'lesson_date' => $storageStart,
        'duration_minutes' => $durationMinutes,
        'lesson_topic' => $lessonTopic,
        'lesson_notes' => $lessonNotes !== '' ? $lessonNotes : null,
    ]);

    $lessonId = (int) $pdo->lastInsertId();

    notificationCreate(
        $pdo,
        (int) $relation['student_id'],
        'lesson_created',
        'Назначен новый урок',
        $user['full_name'] . ' назначил(а) урок «'
            . $relation['subject_name'] . '» на '
            . $lessonDate->format('d.m.Y H:i') . '.',
        NOTIFICATION_SECTION_SCHEDULE,
        'lesson',
        $lessonId,
        notificationLessonTargetDateForUser(
            $pdo,
            (int) $relation['student_id'],
            'student',
            $storageStart
        )
    );

    $pdo->commit();

    successResponse([
        'message' => 'Урок назначен',
        'lesson' => [
            'id' => $lessonId,
            'teacher_id' => (int) $user['id'],
            'student_id' => (int) $relation['student_id'],
            'student_name' => $relation['student_name'],
            'subject_id' => (int) $relation['subject_id'],
            'subject_name' => $relation['subject_name'],
            'lesson_date' => $lessonDate->format('Y-m-d H:i:s'),
            'duration_minutes' => (int) $durationMinutes,
            'status' => 'scheduled',
            'lesson_topic' => $lessonTopic,
            'lesson_notes' => $lessonNotes !== '' ? $lessonNotes : null,
        ],
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('teacher/create-lesson.php: ' . $error->getMessage());
    errorResponse('Не удалось назначить урок', 500);
}
