<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/homework.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Выдавать задания может только преподаватель', 403);
}

try {
    $pdo = getDatabaseConnection();
    $timezone = homeworkUserTimezone($pdo, (int) $user['id'], 'teacher');

    $relationsStmt = $pdo->prepare("
        SELECT
            ts.id AS relation_id,
            ts.student_id,
            ts.subject_id,
            students.full_name AS student_name,
            subjects.name AS subject_name
        FROM teacher_students ts
        INNER JOIN users students
            ON students.id = ts.student_id
           AND students.status = 'active'
        INNER JOIN subjects
            ON subjects.id = ts.subject_id
           AND subjects.is_active = 1
        WHERE ts.teacher_id = :teacher_id
          AND ts.status = 'active'
        ORDER BY students.full_name ASC, subjects.name ASC
    ");
    $relationsStmt->execute(['teacher_id' => (int) $user['id']]);

    $lessonsStmt = $pdo->prepare("
        SELECT
            l.id,
            l.student_id,
            l.subject_id,
            l.lesson_date,
            l.lesson_topic,
            students.full_name AS student_name,
            subjects.name AS subject_name
        FROM lessons l
        INNER JOIN users students ON students.id = l.student_id
        INNER JOIN subjects ON subjects.id = l.subject_id
        WHERE l.teacher_id = :teacher_id
          AND l.status <> 'cancelled'
          AND l.lesson_date >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)
        ORDER BY l.lesson_date DESC
        LIMIT 100
    ");
    $lessonsStmt->execute(['teacher_id' => (int) $user['id']]);
    $lessons = $lessonsStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($lessons as &$lesson) {
        $lesson['id'] = (int) $lesson['id'];
        $lesson['student_id'] = (int) $lesson['student_id'];
        $lesson['subject_id'] = (int) $lesson['subject_id'];
        $lesson['lesson_date'] = homeworkFormatLocalDate(
            $lesson['lesson_date'],
            $timezone
        );
    }
    unset($lesson);

    successResponse([
        'relations' => $relationsStmt->fetchAll(PDO::FETCH_ASSOC),
        'lessons' => $lessons,
        'timezone' => $timezone->getName(),
        'minimum_due_hours' => 24,
        'max_files' => HOMEWORK_MAX_FILES,
        'max_file_bytes' => effectiveUploadMaxBytes(
            'UPLOAD_HOMEWORK_MAX_BYTES',
            10 * 1024 * 1024
        ),
        'max_total_bytes' => effectivePostMaxBytes(
            'UPLOAD_HOMEWORK_TOTAL_MAX_BYTES',
            30 * 1024 * 1024
        ),
    ]);
} catch (Throwable $error) {
    error_log('homework/options.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить данные для задания', 500);
}