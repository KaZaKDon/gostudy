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
            sg.id,
            sg.name,

            (
                SELECT COUNT(*)
                FROM subjects s
                WHERE s.group_id = sg.id
            ) AS subjects_total

        FROM subject_groups sg
        WHERE sg.id = :id
        LIMIT 1
    ");

    $groupStmt->execute([
        'id' => $id,
    ]);

    $group = $groupStmt->fetch(PDO::FETCH_ASSOC);

    if (!$group) {
        adminNotFoundResponse(
            'Группа предметов не найдена'
        );
    }

    if ((int) $group['subjects_total'] > 0) {
        adminConflictResponse(
            'Нельзя удалить группу, пока в ней есть предметы. Сначала перенесите или удалите предметы.'
        );
    }

    $stmt = $pdo->prepare("
        DELETE FROM subject_groups
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
    ]);

    adminSuccessResponse(
        [],
        'Группа предметов удалена'
    );
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка удаления группы предметов'
    );
}