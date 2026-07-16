<?php

declare(strict_types=1);

require_once __DIR__ . '/../../shared/require-admin.php';
require_once __DIR__ . '/../../shared/request.php';
require_once __DIR__ . '/../../shared/validation.php';

requireAdminRequestMethod('POST');

$auth = requireAdmin();
$pdo = $auth['pdo'];

$data = getAdminJsonInput();

$subjectId = requireAdminPositiveId(
    $data['subject_id'] ?? null,
    'ID предмета'
);

$preparations =
    $data['preparations'] ?? null;

if (!is_array($preparations)) {
    adminValidationResponse(
        'Поле preparations должно быть массивом'
    );
}

$normalizedPreparations = [];
$usedPreparationIds = [];

foreach ($preparations as $index => $item) {
    if (!is_array($item)) {
        adminValidationResponse(
            'Некорректная структура направления подготовки'
        );
    }

    $preparationId = requireAdminPositiveId(
        $item['id'] ?? null,
        'ID направления подготовки'
    );

    if (isset($usedPreparationIds[$preparationId])) {
        adminValidationResponse(
            'Одно направление подготовки нельзя указать несколько раз'
        );
    }

    $usedPreparationIds[$preparationId] = true;

    $sortOrder = getAdminSortOrder(
        $item['sort_order'] ?? (($index + 1) * 10)
    );

    $normalizedPreparations[] = [
        'id' => $preparationId,
        'sort_order' => $sortOrder,
    ];
}

try {
    $subjectStmt = $pdo->prepare("
        SELECT
            id,
            name
        FROM subjects
        WHERE id = :id
        LIMIT 1
    ");

    $subjectStmt->execute([
        'id' => $subjectId,
    ]);

    $subject =
        $subjectStmt->fetch(PDO::FETCH_ASSOC);

    if (!$subject) {
        adminNotFoundResponse(
            'Предмет не найден'
        );
    }

    if ($normalizedPreparations) {
        $placeholders = implode(
            ', ',
            array_fill(
                0,
                count($normalizedPreparations),
                '?'
            )
        );

        $preparationIds = array_map(
            static fn (array $item): int =>
                $item['id'],
            $normalizedPreparations
        );

        $preparationStmt = $pdo->prepare("
            SELECT id
            FROM preparations
            WHERE id IN ($placeholders)
        ");

        $preparationStmt->execute(
            $preparationIds
        );

        $existingPreparationIds = array_map(
            'intval',
            $preparationStmt->fetchAll(
                PDO::FETCH_COLUMN
            )
        );

        sort($preparationIds);
        sort($existingPreparationIds);

        if (
            $preparationIds
            !== $existingPreparationIds
        ) {
            adminValidationResponse(
                'Одно или несколько направлений подготовки не найдены'
            );
        }
    }

    $pdo->beginTransaction();

    $deleteStmt = $pdo->prepare("
        DELETE FROM subject_preparations
        WHERE subject_id = :subject_id
    ");

    $deleteStmt->execute([
        'subject_id' => $subjectId,
    ]);

    if ($normalizedPreparations) {
        $insertStmt = $pdo->prepare("
            INSERT INTO subject_preparations (
                subject_id,
                preparation_id,
                sort_order
            ) VALUES (
                :subject_id,
                :preparation_id,
                :sort_order
            )
        ");

        foreach (
            $normalizedPreparations
            as $preparation
        ) {
            $insertStmt->execute([
                'subject_id' => $subjectId,
                'preparation_id' =>
                    $preparation['id'],
                'sort_order' =>
                    $preparation['sort_order'],
            ]);
        }
    }

    $pdo->commit();

    adminSuccessResponse(
        [
            'subject_id' => $subjectId,
            'preparations_total' =>
                count($normalizedPreparations),
        ],
        'Направления подготовки для предмета сохранены'
    );
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    adminServerErrorResponse(
        'Ошибка сохранения связей предмета и направлений подготовки'
    );
}