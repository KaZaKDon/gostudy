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
    'ID предмета'
);

try {
    $subjectStmt = $pdo->prepare("
        SELECT
            s.id,
            s.name,

            (
                SELECT COUNT(*)
                FROM teacher_subjects ts
                WHERE ts.subject_id = s.id
            ) AS teachers_total,

            (
                SELECT COUNT(*)
                FROM teacher_subject_preparations tsp
                WHERE tsp.subject_id = s.id
            ) AS teacher_preparations_total,

            (
                SELECT COUNT(*)
                FROM subject_preparations sp
                WHERE sp.subject_id = s.id
            ) AS preparations_total

        FROM subjects s
        WHERE s.id = :id
        LIMIT 1
    ");

    $subjectStmt->execute([
        'id' => $id,
    ]);

    $subject = $subjectStmt->fetch(PDO::FETCH_ASSOC);

    if (!$subject) {
        adminNotFoundResponse(
            'Предмет не найден'
        );
    }

    if ((int) $subject['teachers_total'] > 0) {
        adminConflictResponse(
            'Нельзя удалить предмет: его уже выбрали преподаватели. Предмет можно только отключить.'
        );
    }

    if ((int) $subject['teacher_preparations_total'] > 0) {
        adminConflictResponse(
            'Нельзя удалить предмет: он используется в направлениях подготовки преподавателей.'
        );
    }

    if ((int) $subject['preparations_total'] > 0) {
        adminConflictResponse(
            'Нельзя удалить предмет, пока к нему привязаны направления подготовки. Сначала удалите связи.'
        );
    }

    $stmt = $pdo->prepare("
        DELETE FROM subjects
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
    ]);

    adminSuccessResponse(
        [],
        'Предмет удалён'
    );
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка удаления предмета'
    );
}