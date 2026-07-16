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
        $conditions[] = 's.group_id = :group_id';
        $params['group_id'] = $groupId;
    }

    if ($isActive !== null) {
        $conditions[] = 's.is_active = :is_active';
        $params['is_active'] = $isActive ? 1 : 0;
    }

    if ($search !== '') {
        $conditions[] = '(
            s.name LIKE :search
            OR s.slug LIKE :search
        )';
        $params['search'] = '%' . $search . '%';
    }

    $whereSql = $conditions !== []
        ? 'WHERE ' . implode(' AND ', $conditions)
        : '';

    $stmt = $pdo->prepare("
        SELECT
            s.id,
            s.group_id,
            s.name,
            s.slug,
            s.is_active,
            s.sort_order,

            sg.name AS group_name,
            sg.slug AS group_slug,
            sg.is_active AS group_is_active,

            (
                SELECT COUNT(*)
                FROM subject_preparations sp
                WHERE sp.subject_id = s.id
            ) AS preparations_total,

            (
                SELECT COUNT(*)
                FROM teacher_subjects ts
                WHERE ts.subject_id = s.id
            ) AS teachers_total,

            (
                SELECT COUNT(*)
                FROM teacher_subject_preparations tsp
                WHERE tsp.subject_id = s.id
            ) AS teacher_preparations_total

        FROM subjects s

        LEFT JOIN subject_groups sg
            ON sg.id = s.group_id

        {$whereSql}

        ORDER BY
            sg.sort_order ASC,
            sg.name ASC,
            s.sort_order ASC,
            s.name ASC,
            s.id ASC
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
        $item['preparations_total'] = (int) $item['preparations_total'];
        $item['teachers_total'] = (int) $item['teachers_total'];

        $item['teacher_preparations_total'] =
            (int) $item['teacher_preparations_total'];
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
        'Ошибка получения предметов'
    );
}