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
    $subjectIds = [];
    $subjectPreparations = [];
    $ageGroups = [];
    $ageGroupIds = [];
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
        $profile = $profileStmt->fetch(PDO::FETCH_ASSOC) ?: null;

        $subjectsStmt = $pdo->prepare("
            SELECT
                s.id,
                s.group_id,
                s.name,
                s.slug,
                sg.name AS group_name
            FROM teacher_subjects ts
            INNER JOIN subjects s
                ON s.id = ts.subject_id
            INNER JOIN subject_groups sg
                ON sg.id = s.group_id
            WHERE ts.teacher_id = :teacher_id
            ORDER BY
                sg.sort_order ASC,
                s.sort_order ASC,
                s.name ASC
        ");
        $subjectsStmt->execute(['teacher_id' => $user['id']]);
        $subjects = $subjectsStmt->fetchAll(PDO::FETCH_ASSOC);
        $subjectIds = array_map(
            static fn (array $subject): int => (int) $subject['id'],
            $subjects
        );

        $preparationsStmt = $pdo->prepare("
            SELECT
                tsp.subject_id,
                tsp.preparation_id
            FROM teacher_subject_preparations tsp
            WHERE tsp.teacher_id = :teacher_id
            ORDER BY tsp.subject_id ASC, tsp.preparation_id ASC
        ");
        $preparationsStmt->execute(['teacher_id' => $user['id']]);

        $preparationIdsBySubject = [];

        foreach ($preparationsStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $subjectId = (int) $row['subject_id'];
            $preparationIdsBySubject[$subjectId][] = (int) $row['preparation_id'];
        }

        foreach ($preparationIdsBySubject as $subjectId => $preparationIds) {
            $subjectPreparations[] = [
                'subject_id' => $subjectId,
                'preparation_ids' => $preparationIds,
            ];
        }

        $ageGroupsStmt = $pdo->prepare("
            SELECT
                sag.id,
                sag.name,
                sag.slug
            FROM teacher_age_groups tag
            INNER JOIN student_age_groups sag
                ON sag.id = tag.age_group_id
            WHERE tag.teacher_id = :teacher_id
            ORDER BY sag.sort_order ASC, sag.name ASC
        ");
        $ageGroupsStmt->execute(['teacher_id' => $user['id']]);
        $ageGroups = $ageGroupsStmt->fetchAll(PDO::FETCH_ASSOC);
        $ageGroupIds = array_map(
            static fn (array $ageGroup): int => (int) $ageGroup['id'],
            $ageGroups
        );

        $educationStmt = $pdo->prepare("
            SELECT *
            FROM teacher_education
            WHERE teacher_id = :teacher_id
            ORDER BY is_primary DESC, sort_order ASC, id ASC
        ");
        $educationStmt->execute(['teacher_id' => $user['id']]);
        $education = $educationStmt->fetchAll(PDO::FETCH_ASSOC);

        $documentsStmt = $pdo->prepare("
            SELECT
                id,
                education_id,
                type,
                document_title,
                institution,
                document_year,
                original_name,
                mime_type,
                file_size,
                status,
                reject_reason,
                checked_at,
                created_at,
                updated_at
            FROM teacher_documents
            WHERE teacher_id = :teacher_id
            ORDER BY sort_order ASC, id ASC
        ");
        $documentsStmt->execute(['teacher_id' => $user['id']]);
        $documents = $documentsStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    if ($user['role'] === 'student') {
        $profileStmt = $pdo->prepare("
            SELECT *
            FROM student_profiles
            WHERE user_id = :user_id
            LIMIT 1
        ");
        $profileStmt->execute(['user_id' => $user['id']]);
        $profile = $profileStmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    successResponse([
        'user' => $user,
        'profile' => $profile,
        'subjects' => $subjects,
        'subject_ids' => $subjectIds,
        'subject_preparations' => $subjectPreparations,
        'age_groups' => $ageGroups,
        'age_group_ids' => $ageGroupIds,
        'education' => $education,
        'documents' => $documents,
    ]);
} catch (Throwable $error) {
    error_log('profile/me.php: ' . $error->getMessage());
    errorResponse('Ошибка загрузки профиля', 500);
}
