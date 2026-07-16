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
            sag.id,
            sag.name,
            sag.slug,
            sag.is_active,
            sag.sort_order,
            sag.created_at,
            sag.updated_at,

            (
                SELECT COUNT(DISTINCT tag.teacher_id)
                FROM teacher_age_groups tag
                WHERE tag.age_group_id = sag.id
            ) AS teachers_total

        FROM student_age_groups sag

        ORDER BY
            sag.sort_order ASC,
            sag.name ASC,
            sag.id ASC
    ");

    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($items as &$item) {
        $item['id'] = (int) $item['id'];
        $item['is_active'] = (bool) $item['is_active'];
        $item['sort_order'] = (int) $item['sort_order'];
        $item['teachers_total'] = (int) $item['teachers_total'];
    }

    unset($item);

    adminSuccessResponse([
        'items' => $items,
    ]);
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка получения возрастных групп'
    );
}