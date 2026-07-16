<?php

declare(strict_types=1);

require_once __DIR__ . '/../../shared/require-admin.php';
require_once __DIR__ . '/../../shared/request.php';
require_once __DIR__ . '/../../shared/validation.php';

requireAdminRequestMethod('POST');

$auth = requireAdmin();
$pdo = $auth['pdo'];

$data = getAdminJsonInput();

$groupId = requireAdminPositiveId(
    $data['group_id'] ?? null,
    'ID группы'
);

$name = requireAdminName(
    $data['name'] ?? null,
    'Название направления'
);

$slug = requireAdminSlug(
    $data['slug'] ?? null,
    'Slug'
);

$sortOrder = getAdminSortOrder(
    $data['sort_order'] ?? null,
    100
);

$isActive = getAdminBoolean(
    $data['is_active'] ?? null,
    true
);

try {
    $groupStmt = $pdo->prepare("
        SELECT id
        FROM preparation_groups
        WHERE id = :id
        LIMIT 1
    ");

    $groupStmt->execute([
        'id' => $groupId,
    ]);

    if (!$groupStmt->fetch(PDO::FETCH_ASSOC)) {
        adminNotFoundResponse(
            'Группа направлений подготовки не найдена'
        );
    }

    $duplicateSlugStmt = $pdo->prepare("
        SELECT id
        FROM preparations
        WHERE slug = :slug
        LIMIT 1
    ");

    $duplicateSlugStmt->execute([
        'slug' => $slug,
    ]);

    if ($duplicateSlugStmt->fetch(PDO::FETCH_ASSOC)) {
        adminConflictResponse(
            'Направление с таким slug уже существует'
        );
    }

    $duplicateNameStmt = $pdo->prepare("
        SELECT id
        FROM preparations
        WHERE group_id = :group_id
          AND name = :name
        LIMIT 1
    ");

    $duplicateNameStmt->execute([
        'group_id' => $groupId,
        'name' => $name,
    ]);

    if ($duplicateNameStmt->fetch(PDO::FETCH_ASSOC)) {
        adminConflictResponse(
            'В выбранной группе уже есть направление с таким названием'
        );
    }

    $stmt = $pdo->prepare("
        INSERT INTO preparations (
            group_id,
            name,
            slug,
            is_active,
            sort_order
        ) VALUES (
            :group_id,
            :name,
            :slug,
            :is_active,
            :sort_order
        )
    ");

    $stmt->execute([
        'group_id' => $groupId,
        'name' => $name,
        'slug' => $slug,
        'is_active' => $isActive ? 1 : 0,
        'sort_order' => $sortOrder,
    ]);

    adminSuccessResponse(
        [
            'id' => (int) $pdo->lastInsertId(),
        ],
        'Направление подготовки создано',
        201
    );
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка создания направления подготовки'
    );
}