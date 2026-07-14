<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'student') {
    errorResponse('Расписание доступно только ученику', 403);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            lessons.id,
            lessons.teacher_id,
            lessons.student_id,
            lessons.subject_id,
            lessons.title,
            lessons.lesson_date,
            lessons.duration_minutes,
            lessons.status,
            lessons.lesson_topic,
            lessons.lesson_notes,
            subjects.name AS subject_name,
            teachers.full_name AS teacher_name
        FROM lessons
        LEFT JOIN subjects
            ON subjects.id = lessons.subject_id
        LEFT JOIN users AS teachers
            ON teachers.id = lessons.teacher_id
        WHERE lessons.student_id = :student_id
        ORDER BY lessons.lesson_date ASC
    ");

    $stmt->execute([
        'student_id' => $user['id'],
    ]);

    $schedule = $stmt->fetchAll();

    successResponse([
        'schedule' => $schedule,
    ]);
} catch (Throwable $error) {
    errorResponse('Не удалось загрузить расписание', 500);
}