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
    errorResponse('Профиль ученика доступен только ученику', 403);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            student_profiles.id,
            student_profiles.user_id,
            student_profiles.first_name,
            student_profiles.last_name,
            users.phone,
            student_profiles.city,
            student_profiles.timezone,
            student_profiles.birth_year,
            student_profiles.class_level,
            student_profiles.subjects,
            student_profiles.goal,
            student_profiles.learning_goals,
            student_profiles.level_description,
            student_profiles.lesson_format,
            student_profiles.parent_name,
            student_profiles.parent_phone,
            student_profiles.parent_email,
            student_profiles.messenger,
            student_profiles.contact_preference,
            student_profiles.preferred_time,
            student_profiles.schedule_comment,
            student_profiles.about,
            student_profiles.profile_version,
            student_profiles.profile_completion,
            student_profiles.created_at,
            student_profiles.updated_at
        FROM student_profiles
        INNER JOIN users
            ON users.id = student_profiles.user_id
        WHERE student_profiles.user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'user_id' => $user['id'],
    ]);

    $profile = $stmt->fetch();

    successResponse([
        'profile' => $profile ?: null,
    ]);
} catch (Throwable $error) {
    errorResponse('Ошибка загрузки анкеты ученика', 500);
}