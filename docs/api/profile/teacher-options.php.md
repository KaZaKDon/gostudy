<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/upload.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Справочники анкеты доступны только преподавателю', 403);
}

try {
    $pdo = getDatabaseConnection();

    $subjectsStmt = $pdo->query("
        SELECT
            sg.id AS group_id,
            sg.name AS group_name,
            sg.slug AS group_slug,
            sg.sort_order AS group_sort_order,
            s.id AS subject_id,
            s.name AS subject_name,
            s.slug AS subject_slug,
            s.sort_order AS subject_sort_order
        FROM subject_groups sg
        INNER JOIN subjects s
            ON s.group_id = sg.id
        WHERE sg.is_active = 1
          AND s.is_active = 1
        ORDER BY
            sg.sort_order ASC,
            sg.name ASC,
            s.sort_order ASC,
            s.name ASC
    ");

    $preparationsStmt = $pdo->query("
        SELECT
            sp.subject_id,
            pg.id AS group_id,
            pg.name AS group_name,
            pg.slug AS group_slug,
            pg.sort_order AS group_sort_order,
            p.id AS preparation_id,
            p.name AS preparation_name,
            p.slug AS preparation_slug,
            sp.sort_order AS link_sort_order,
            p.sort_order AS preparation_sort_order
        FROM subject_preparations sp
        INNER JOIN subjects s
            ON s.id = sp.subject_id
        INNER JOIN subject_groups sg
            ON sg.id = s.group_id
        INNER JOIN preparations p
            ON p.id = sp.preparation_id
        INNER JOIN preparation_groups pg
            ON pg.id = p.group_id
        WHERE s.is_active = 1
          AND sg.is_active = 1
          AND p.is_active = 1
          AND pg.is_active = 1
        ORDER BY
            sp.subject_id ASC,
            pg.sort_order ASC,
            pg.name ASC,
            sp.sort_order ASC,
            p.sort_order ASC,
            p.name ASC
    ");

    $ageGroupsStmt = $pdo->query("
        SELECT
            id,
            name,
            slug,
            sort_order
        FROM student_age_groups
        WHERE is_active = 1
        ORDER BY sort_order ASC, name ASC
    ");

    $preparationGroupsBySubject = [];

    foreach ($preparationsStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $subjectId = (int) $row['subject_id'];
        $groupId = (int) $row['group_id'];

        if (!isset($preparationGroupsBySubject[$subjectId][$groupId])) {
            $preparationGroupsBySubject[$subjectId][$groupId] = [
                'id' => $groupId,
                'name' => $row['group_name'],
                'slug' => $row['group_slug'],
                'preparations' => [],
            ];
        }

        $preparationGroupsBySubject[$subjectId][$groupId]['preparations'][] = [
            'id' => (int) $row['preparation_id'],
            'name' => $row['preparation_name'],
            'slug' => $row['preparation_slug'],
        ];
    }

    $subjectGroups = [];

    foreach ($subjectsStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $groupId = (int) $row['group_id'];
        $subjectId = (int) $row['subject_id'];

        if (!isset($subjectGroups[$groupId])) {
            $subjectGroups[$groupId] = [
                'id' => $groupId,
                'name' => $row['group_name'],
                'slug' => $row['group_slug'],
                'subjects' => [],
            ];
        }

        $subjectGroups[$groupId]['subjects'][] = [
            'id' => $subjectId,
            'name' => $row['subject_name'],
            'slug' => $row['subject_slug'],
            'preparation_groups' => isset($preparationGroupsBySubject[$subjectId])
                ? array_values($preparationGroupsBySubject[$subjectId])
                : [],
        ];
    }

    $ageGroups = array_map(
        static fn (array $row): array => [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'slug' => $row['slug'],
        ],
        $ageGroupsStmt->fetchAll(PDO::FETCH_ASSOC)
    );

    successResponse([
        'subject_groups' => array_values($subjectGroups),
        'age_groups' => $ageGroups,
        'upload_limits' => [
            'photo_max_bytes' => effectiveUploadMaxBytes(
                'UPLOAD_PHOTO_MAX_BYTES',
                5 * 1024 * 1024
            ),
            'document_max_bytes' => effectiveUploadMaxBytes(
                'UPLOAD_DOCUMENT_MAX_BYTES',
                10 * 1024 * 1024
            ),
            'video_max_bytes' => effectiveUploadMaxBytes(
                'UPLOAD_VIDEO_MAX_BYTES',
                100 * 1024 * 1024
            ),
        ],
    ]);
} catch (Throwable $error) {
    error_log('teacher-options.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить справочники анкеты', 500);
}
