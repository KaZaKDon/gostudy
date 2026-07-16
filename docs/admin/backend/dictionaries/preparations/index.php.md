<?php

declare(strict_types=1);

require_once __DIR__ . '/../../shared/require-moderator.php';
require_once __DIR__ . '/../../shared/request.php';

requireAdminRequestMethod('GET');

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];

$groupId = getAdminQueryInt('group_id', 0);
$isActive = getAdminQueryBool('is_active');
$search = getAdminQueryString('search');

try {
    $conditions = [];
    $params = [];

    if ($groupId > 0) {
        $conditions[] = 'p.group_id = :group_id';
        $params['group_id'] = $groupId;
    }

    if ($isActive !== null) {
        $conditions[] = 'p.is_active = :is_active';
        $params['is_active'] = $isActive ? 1 : 0;
    }

    if ($search !== '') {
        $conditions[] = '(
            p.name LIKE :search
            OR p.slug LIKE :search
        )';

        $params['search'] = '%' . $search . '%';
    }

    $whereSql = $conditions !== []
        ? 'WHERE ' . implode(' AND ', $conditions)
        : '';

    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.group_id,
            p.name,
            p.slug,
            p.is_active,
            p.sort_order,
            p.created_at,
            p.updated_at,

            pg.name AS group_name,
            pg.slug AS group_slug,
            pg.is_active AS group_is_active,

            (
                SELECT COUNT(*)
                FROM subject_preparations sp
                WHERE sp.preparation_id = p.id
            ) AS subjects_total,

            (
                SELECT COUNT(*)
                FROM teacher_subject_preparations tsp
                WHERE tsp.preparation_id = p.id
            ) AS teachers_total

        FROM preparations p

        LEFT JOIN preparation_groups pg
            ON pg.id = p.group_id

        {$whereSql}

        ORDER BY
            pg.sort_order ASC,
            pg.name ASC,
            p.sort_order ASC,
            p.name ASC,
            p.id ASC
    ");

    $stmt->execute($params);

    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($items as &$item) {
        $item['id'] = (int) $item['id'];

        $item['group_id'] = $item['group_id'] !== null
            ? (int) $item['group_id']
            : null;

        $item['is_active'] = (bool) $item['is_active'];

        $item['group_is_active'] = $item['group_is_active'] !== null
            ? (bool) $item['group_is_active']
            : null;

        $item['sort_order'] = (int) $item['sort_order'];
        $item['subjects_total'] = (int) $item['subjects_total'];
        $item['teachers_total'] = (int) $item['teachers_total'];
    }

    unset($item);

    adminSuccessResponse([
        'items' => $items,
        'filters' => [
            'group_id' => $groupId > 0 ? $groupId : null,
            'is_active' => $isActive,
            'search' => $search,
        ],
    ]);
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка получения направлений подготовки'
    );
}