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
            sg.id,
            sg.name,
            sg.slug,
            sg.is_active,
            sg.sort_order,
            sg.created_at,
            sg.updated_at,

            (
                SELECT COUNT(*)
                FROM subjects s
                WHERE s.group_id = sg.id
            ) AS subjects_total,

            (
                SELECT COUNT(*)
                FROM subjects s
                WHERE s.group_id = sg.id
                  AND s.is_active = 1
            ) AS active_subjects_total

        FROM subject_groups sg

        ORDER BY
            sg.sort_order ASC,
            sg.name ASC,
            sg.id ASC
    ");

    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($items as &$item) {
        $item['id'] = (int) $item['id'];
        $item['is_active'] = (bool) $item['is_active'];
        $item['sort_order'] = (int) $item['sort_order'];
        $item['subjects_total'] = (int) $item['subjects_total'];
        $item['active_subjects_total'] =
            (int) $item['active_subjects_total'];
    }

    unset($item);

    adminSuccessResponse([
        'items' => $items,
    ]);
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка получения групп предметов'
    );
}