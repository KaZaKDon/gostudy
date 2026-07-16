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
    'ID возрастной группы'
);

try {
    $ageGroupStmt = $pdo->prepare("
        SELECT
            sag.id,
            sag.name,

            (
                SELECT COUNT(DISTINCT tag.teacher_id)
                FROM teacher_age_groups tag
                WHERE tag.age_group_id = sag.id
            ) AS teachers_total

        FROM student_age_groups sag
        WHERE sag.id = :id
        LIMIT 1
    ");

    $ageGroupStmt->execute([
        'id' => $id,
    ]);

    $ageGroup = $ageGroupStmt->fetch(PDO::FETCH_ASSOC);

    if (!$ageGroup) {
        adminNotFoundResponse(
            'Возрастная группа не найдена'
        );
    }

    if ((int) $ageGroup['teachers_total'] > 0) {
        adminConflictResponse(
            'Нельзя удалить возрастную группу, пока она выбрана у преподавателей. Сначала удалите её из анкет преподавателей.'
        );
    }

    $stmt = $pdo->prepare("
        DELETE FROM student_age_groups
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
    ]);

    adminSuccessResponse(
        [],
        'Возрастная группа удалена'
    );
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка удаления возрастной группы'
    );
}