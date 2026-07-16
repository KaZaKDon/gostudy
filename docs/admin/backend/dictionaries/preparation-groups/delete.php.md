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

try {
    $groupStmt = $pdo->prepare("
        SELECT
            pg.id,
            pg.name,

            (
                SELECT COUNT(*)
                FROM preparations p
                WHERE p.group_id = pg.id
            ) AS preparations_total

        FROM preparation_groups pg
        WHERE pg.id = :id
        LIMIT 1
    ");

    $groupStmt->execute([
        'id' => $id,
    ]);

    $group = $groupStmt->fetch(PDO::FETCH_ASSOC);

    if (!$group) {
        adminNotFoundResponse(
            'Группа направлений подготовки не найдена'
        );
    }

    if ((int) $group['preparations_total'] > 0) {
        adminConflictResponse(
            'Нельзя удалить группу, пока в ней есть направления подготовки. Сначала перенесите или удалите направления.'
        );
    }

    $stmt = $pdo->prepare("
        DELETE FROM preparation_groups
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
    ]);

    adminSuccessResponse(
        [],
        'Группа направлений удалена'
    );
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка удаления группы направлений подготовки'
    );
}