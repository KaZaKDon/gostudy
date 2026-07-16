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

try {
    $preparationStmt = $pdo->prepare("
        SELECT
            p.id,
            p.name,

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
        WHERE p.id = :id
        LIMIT 1
    ");

    $preparationStmt->execute([
        'id' => $id,
    ]);

    $preparation = $preparationStmt->fetch(PDO::FETCH_ASSOC);

    if (!$preparation) {
        adminNotFoundResponse(
            'Направление подготовки не найдено'
        );
    }

    if ((int) $preparation['teachers_total'] > 0) {
        adminConflictResponse(
            'Нельзя удалить направление: его уже выбрали преподаватели. Направление можно только отключить.'
        );
    }

    if ((int) $preparation['subjects_total'] > 0) {
        adminConflictResponse(
            'Нельзя удалить направление, пока оно связано с предметами. Сначала удалите связи.'
        );
    }

    $stmt = $pdo->prepare("
        DELETE FROM preparations
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
    ]);

    adminSuccessResponse(
        [],
        'Направление подготовки удалено'
    );
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка удаления направления подготовки'
    );
}