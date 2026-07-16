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
    'ID направления'
);

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
    false
);

try {
    $preparationStmt = $pdo->prepare("
        SELECT id
        FROM preparations
        WHERE id = :id
        LIMIT 1
    ");

    $preparationStmt->execute([
        'id' => $id,
    ]);

    if (!$preparationStmt->fetch(PDO::FETCH_ASSOC)) {
        adminNotFoundResponse(
            'Направление подготовки не найдено'
        );
    }

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
          AND id <> :id
        LIMIT 1
    ");

    $duplicateSlugStmt->execute([
        'slug' => $slug,
        'id' => $id,
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
          AND id <> :id
        LIMIT 1
    ");

    $duplicateNameStmt->execute([
        'group_id' => $groupId,
        'name' => $name,
        'id' => $id,
    ]);

    if ($duplicateNameStmt->fetch(PDO::FETCH_ASSOC)) {
        adminConflictResponse(
            'В выбранной группе уже есть направление с таким названием'
        );
    }

    $stmt = $pdo->prepare("
        UPDATE preparations
        SET
            group_id = :group_id,
            name = :name,
            slug = :slug,
            is_active = :is_active,
            sort_order = :sort_order
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
        'group_id' => $groupId,
        'name' => $name,
        'slug' => $slug,
        'is_active' => $isActive ? 1 : 0,
        'sort_order' => $sortOrder,
    ]);

    adminSuccessResponse(
        [],
        'Направление подготовки обновлено'
    );
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка обновления направления подготовки'
    );
}