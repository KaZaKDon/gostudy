<?php

declare(strict_types=1);

require_once __DIR__ . '/../../shared/require-admin.php';
require_once __DIR__ . '/../../shared/request.php';
require_once __DIR__ . '/../../shared/validation.php';

requireAdminRequestMethod('POST');

$auth = requireAdmin();
$pdo = $auth['pdo'];

$data = getAdminJsonInput();

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
    true
);

try {
    $duplicateStmt = $pdo->prepare("
        SELECT
            id,
            name,
            slug
        FROM student_age_groups
        WHERE name = :name
           OR slug = :slug
        LIMIT 1
    ");

    $duplicateStmt->execute([
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
        INSERT INTO student_age_groups (
            name,
            slug,
            is_active,
            sort_order
        ) VALUES (
            :name,
            :slug,
            :is_active,
            :sort_order
        )
    ");

    $stmt->execute([
        'name' => $name,
        'slug' => $slug,
        'is_active' => $isActive ? 1 : 0,
        'sort_order' => $sortOrder,
    ]);

    adminSuccessResponse(
        [
            'id' => (int) $pdo->lastInsertId(),
        ],
        'Возрастная группа создана',
        201
    );
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка создания возрастной группы'
    );
}