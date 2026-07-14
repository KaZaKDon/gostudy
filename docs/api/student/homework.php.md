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
    errorResponse('Домашние задания доступны только ученику', 403);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            homework.id,
            homework.lesson_id,
            homework.teacher_id,
            homework.student_id,
            homework.title,
            homework.description,
            homework.due_date,
            homework.status,
            homework.created_at,
            homework.updated_at,

            teachers.full_name AS teacher_name,

            lessons.lesson_date,
            lessons.lesson_topic,

            subjects.id AS subject_id,
            subjects.name AS subject_name

        FROM homework

        INNER JOIN users AS teachers
            ON teachers.id = homework.teacher_id

        LEFT JOIN lessons
            ON lessons.id = homework.lesson_id

        LEFT JOIN subjects
            ON subjects.id = lessons.subject_id

        WHERE homework.student_id = :student_id

        ORDER BY
            CASE homework.status
                WHEN 'active' THEN 1
                WHEN 'expired' THEN 2
                WHEN 'completed' THEN 3
                ELSE 4
            END,
            homework.due_date ASC,
            homework.created_at DESC
    ");

    $stmt->execute([
        'student_id' => $user['id'],
    ]);

    successResponse([
        'homework' => $stmt->fetchAll(),
    ]);
} catch (Throwable $error) {
    errorResponse('Не удалось загрузить домашние задания', 500);
}