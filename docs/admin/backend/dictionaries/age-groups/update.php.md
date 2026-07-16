<?php

declare(strict_types=1);

require_once __DIR__ . '/../../shared/require-admin.php';
require_once __DIR__ . '/../../shared/request.php';
require_once __DIR__ . '/../../shared/validation.php';

requireAdminRequestMethod('POST');

$auth = requireAdmin();
$pdo = $auth['pdo'];

$data = getAdminJsonInput();

$id = requireAdminPositiveId(
    $data['id'] ?? null,
    'ID возрастной группы'
);

$name = requireAdminName(
    $data['name'] ?? null,
    'Название возрастной группы'
);

$slug = requireAdminSlug(
    $data['slug'] ?? null,
    'Slug'
);

$sortOrder = getAdminSortOrder(
    $data['sort_order'] ?? null
);

$isActive = getAdminBoolean(
    $data['is_active'] ?? null,
    false
);

try {
    $ageGroupStmt = $pdo->prepare("
        SELECT id
        FROM student_age_groups
        WHERE id = :id
        LIMIT 1
    ");

    $ageGroupStmt->execute([
        'id' => $id,
    ]);

    if (!$ageGroupStmt->fetch(PDO::FETCH_ASSOC)) {
        adminNotFoundResponse(
            'Возрастная группа не найдена'
        );
    }

    $duplicateStmt = $pdo->prepare("
        SELECT
            id,
            name,
            slug
        FROM student_age_groups
        WHERE id <> :id
          AND (
              name = :name
              OR slug = :slug
          )
        LIMIT 1
    ");

    $duplicateStmt->execute([
        'id' => $id,
        'name' => $name,
        'slug' => $slug,
    ]);

    $duplicate = $duplicateStmt->fetch(PDO::FETCH_ASSOC);

    if ($duplicate) {
        if ($duplicate['name'] === $name) {
            adminConflictResponse(
                'Возрастная группа с таким названием уже существует'
            );
        }

        adminConflictResponse(
            'Возрастная группа с таким slug уже существует'
        );
    }

    $stmt = $pdo->prepare("
        UPDATE student_age_groups
        SET
            name = :name,
            slug = :slug,
            is_active = :is_active,
            sort_order = :sort_order
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
        'name' => $name,
        'slug' => $slug,
        'is_active' => $isActive ? 1 : 0,
        'sort_order' => $sortOrder,
    ]);

    adminSuccessResponse(
        [],
        'Возрастная группа обновлена'
    );
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка обновления возрастной группы'
    );
}