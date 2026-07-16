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
    'ID группы'
);

$name = requireAdminName(
    $data['name'] ?? null,
    'Название группы'
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
    $groupStmt = $pdo->prepare("
        SELECT id
        FROM preparation_groups
        WHERE id = :id
        LIMIT 1
    ");

    $groupStmt->execute([
        'id' => $id,
    ]);

    if (!$groupStmt->fetch(PDO::FETCH_ASSOC)) {
        adminNotFoundResponse(
            'Группа направлений подготовки не найдена'
        );
    }

    $duplicateStmt = $pdo->prepare("
        SELECT
            id,
            name,
            slug
        FROM preparation_groups
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
                'Группа с таким названием уже существует'
            );
        }

        adminConflictResponse(
            'Группа с таким slug уже существует'
        );
    }

    $stmt = $pdo->prepare("
        UPDATE preparation_groups
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
        'Группа направлений обновлена'
    );
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка обновления группы направлений подготовки'
    );
}