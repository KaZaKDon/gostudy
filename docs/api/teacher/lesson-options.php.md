<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/lesson-time.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Назначать уроки может только преподаватель', 403);
}

try {
    $pdo = getDatabaseConnection();

    $profileStmt = $pdo->prepare("
        SELECT
            timezone,
            price_45,
            price_60,
            price_90
        FROM teacher_profiles
        WHERE user_id = :teacher_id
        LIMIT 1
    ");

    $profileStmt->execute([
        'teacher_id' => $user['id'],
    ]);

    $profile = $profileStmt->fetch(PDO::FETCH_ASSOC);

    if (!$profile) {
        errorResponse('Профиль преподавателя не найден', 404);
    }

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
           AND students.role = 'student'
           AND students.status = 'active'
        INNER JOIN subjects
            ON subjects.id = ts.subject_id
           AND subjects.is_active = 1
        WHERE ts.teacher_id = :teacher_id
          AND ts.status = 'active'
        ORDER BY students.full_name ASC, subjects.name ASC
    ");

    $relationsStmt->execute([
        'teacher_id' => $user['id'],
    ]);

    $durations = [];

    foreach ([45, 60, 90] as $duration) {
        $price = $profile['price_' . $duration] ?? null;

        if ($price !== null && (float) $price > 0) {
            $durations[] = [
                'minutes' => $duration,
                'price' => (float) $price,
            ];
        }
    }

    successResponse([
        'relations' => $relationsStmt->fetchAll(PDO::FETCH_ASSOC),
        'durations' => $durations,
        'timezone' => lessonResolveTimezone(
            $profile['timezone'] ?? null
        )->getName(),
    ]);
} catch (Throwable $error) {
    error_log('teacher/lesson-options.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить данные для назначения урока', 500);
}
