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
    errorResponse('Дневник доступен только ученику', 403);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            lessons.id AS lesson_id,
            lessons.lesson_date,
            lessons.lesson_topic,
            lessons.lesson_notes,
            lessons.title AS lesson_title,
            lessons.status AS lesson_status,

            subjects.id AS subject_id,
            subjects.name AS subject_name,

            teachers.full_name AS teacher_name,

            lesson_results.attendance,
            lesson_results.grade,
            lesson_results.lesson_result,
            lesson_results.teacher_comment,
            lesson_results.homework_comment,

            homework.id AS homework_id,
            homework.title AS homework_title,
            homework.description AS homework_description,
            homework.due_date AS homework_due_date,
            homework.status AS homework_status

        FROM lessons

        LEFT JOIN subjects
            ON subjects.id = lessons.subject_id

        LEFT JOIN users AS teachers
            ON teachers.id = lessons.teacher_id

        LEFT JOIN lesson_results
            ON lesson_results.lesson_id = lessons.id

        LEFT JOIN homework
            ON homework.lesson_id = lessons.id
            AND homework.student_id = lessons.student_id

        WHERE lessons.student_id = :student_id
          AND lessons.status = 'completed'

        ORDER BY
            subjects.name ASC,
            lessons.lesson_date DESC
    ");

    $stmt->execute([
        'student_id' => $user['id'],
    ]);

    successResponse([
        'diary' => $stmt->fetchAll(),
    ]);
} catch (Throwable $error) {
    errorResponse('Не удалось загрузить дневник', 500);
}