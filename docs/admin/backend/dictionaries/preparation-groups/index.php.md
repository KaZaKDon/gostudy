<?php

declare(strict_types=1);

require_once __DIR__ . '/../../shared/require-moderator.php';
require_once __DIR__ . '/../../shared/request.php';

requireAdminRequestMethod('GET');

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];

try {
    $stmt = $pdo->query("
        SELECT
            pg.id,
            pg.name,
            pg.slug,
            pg.is_active,
            pg.sort_order,
            pg.created_at,
            pg.updated_at,

            (
                SELECT COUNT(*)
                FROM preparations p
                WHERE p.group_id = pg.id
            ) AS preparations_total,

            (
                SELECT COUNT(*)
                FROM preparations p
                WHERE p.group_id = pg.id
                  AND p.is_active = 1
            ) AS active_preparations_total

        FROM preparation_groups pg

        ORDER BY
            pg.sort_order ASC,
            pg.name ASC,
            pg.id ASC
    ");

    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($items as &$item) {
        $item['id'] = (int) $item['id'];
        $item['is_active'] = (bool) $item['is_active'];
        $item['sort_order'] = (int) $item['sort_order'];
        $item['preparations_total'] =
            (int) $item['preparations_total'];
        $item['active_preparations_total'] =
            (int) $item['active_preparations_total'];
    }

    unset($item);

    adminSuccessResponse([
        'items' => $items,
    ]);
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка получения групп направлений подготовки'
    );
}