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

try {
    $pdo = getDatabaseConnection();

    $profile = null;
    $subjects = [];
    $education = [];
    $documents = [];

    if ($user['role'] === 'teacher') {
        $profileStmt = $pdo->prepare("
            SELECT *
            FROM teacher_profiles
            WHERE user_id = :user_id
            LIMIT 1
        ");
        $profileStmt->execute(['user_id' => $user['id']]);
        $profile = $profileStmt->fetch() ?: null;

        $subjectsStmt = $pdo->prepare("
            SELECT
                subjects.id,
                subjects.name,
                subjects.slug
            FROM teacher_subjects
            INNER JOIN subjects ON subjects.id = teacher_subjects.subject_id
            WHERE teacher_subjects.teacher_id = :teacher_id
              AND subjects.is_active = 1
            ORDER BY subjects.sort_order ASC, subjects.name ASC
        ");
        $subjectsStmt->execute(['teacher_id' => $user['id']]);
        $subjects = $subjectsStmt->fetchAll();

        $educationStmt = $pdo->prepare("
            SELECT *
            FROM teacher_education
            WHERE teacher_id = :teacher_id
            ORDER BY is_primary DESC, sort_order ASC, id ASC
        ");
        $educationStmt->execute(['teacher_id' => $user['id']]);
        $education = $educationStmt->fetchAll();

        $documentsStmt = $pdo->prepare("
            SELECT *
            FROM teacher_documents
            WHERE teacher_id = :teacher_id
            ORDER BY sort_order ASC, id ASC
        ");
        $documentsStmt->execute(['teacher_id' => $user['id']]);
        $documents = $documentsStmt->fetchAll();
    }

    if ($user['role'] === 'student') {
        $profileStmt = $pdo->prepare("
            SELECT *
            FROM student_profiles
            WHERE user_id = :user_id
            LIMIT 1
        ");
        $profileStmt->execute(['user_id' => $user['id']]);
        $profile = $profileStmt->fetch() ?: null;
    }

    successResponse([
        'user' => $user,
        'profile' => $profile,
        'subjects' => $subjects,
        'education' => $education,
        'documents' => $documents,
    ]);
} catch (Throwable $error) {
    errorResponse('Ошибка загрузки профиля', 500);
}