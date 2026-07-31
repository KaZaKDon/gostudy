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

$preparations = $data['preparations'] ?? null;

if (!is_array($preparations)) {
    adminValidationResponse('Поле preparations должно быть массивом');
}

$normalizedPreparations = [];
$usedPreparationIds = [];

foreach ($preparations as $index => $item) {
    if (!is_array($item)) {
        adminValidationResponse('Некорректная структура направления подготовки');
    }

    $preparationId = requireAdminPositiveId(
        $item['id'] ?? null,
        'ID направления подготовки'
    );

    if (isset($usedPreparationIds[$preparationId])) {
        adminValidationResponse('Одно направление подготовки нельзя указать несколько раз');
    }

    $usedPreparationIds[$preparationId] = true;

    $normalizedPreparations[] = [
        'id' => $preparationId,
        'sort_order' => getAdminSortOrder(
            $item['sort_order'] ?? (($index + 1) * 10)
        ),
    ];
}

try {
    $subjectStmt = $pdo->prepare("
        SELECT id, name
        FROM subjects
        WHERE id = :id
        LIMIT 1
    ");
    $subjectStmt->execute(['id' => $subjectId]);
    $subject = $subjectStmt->fetch(PDO::FETCH_ASSOC);

    if (!$subject) {
        adminNotFoundResponse('Предмет не найден');
    }

    $preparationIds = array_map(
        static fn (array $item): int => $item['id'],
        $normalizedPreparations
    );

    if ($preparationIds !== []) {
        $placeholders = implode(',', array_fill(0, count($preparationIds), '?'));
        $preparationStmt = $pdo->prepare("
            SELECT id
            FROM preparations
            WHERE id IN ($placeholders)
        ");
        $preparationStmt->execute($preparationIds);
        $existingPreparationIds = array_map(
            'intval',
            $preparationStmt->fetchAll(PDO::FETCH_COLUMN)
        );

        $sortedPreparationIds = $preparationIds;
        sort($sortedPreparationIds);
        sort($existingPreparationIds);

        if ($sortedPreparationIds !== $existingPreparationIds) {
            adminValidationResponse('Одно или несколько направлений подготовки не найдены');
        }
    }

    $pdo->beginTransaction();

    $removalSql = "
        SELECT DISTINCT tsp.preparation_id
        FROM teacher_subject_preparations tsp
        WHERE tsp.subject_id = ?
    ";
    $removalParams = [$subjectId];

    if ($preparationIds !== []) {
        $removalPlaceholders = implode(',', array_fill(0, count($preparationIds), '?'));
        $removalSql .= " AND tsp.preparation_id NOT IN ($removalPlaceholders)";
        $removalParams = [...$removalParams, ...$preparationIds];
    }

    $inUseStmt = $pdo->prepare($removalSql);
    $inUseStmt->execute($removalParams);
    $inUsePreparationIds = $inUseStmt->fetchAll(PDO::FETCH_COLUMN);

    if ($inUsePreparationIds !== []) {
        $pdo->rollBack();
        adminValidationResponse(
            'Нельзя удалить связь: направление уже выбрано в анкетах преподавателей'
        );
    }

    $deleteSql = "
        DELETE FROM subject_preparations
        WHERE subject_id = ?
    ";
    $deleteParams = [$subjectId];

    if ($preparationIds !== []) {
        $deletePlaceholders = implode(',', array_fill(0, count($preparationIds), '?'));
        $deleteSql .= " AND preparation_id NOT IN ($deletePlaceholders)";
        $deleteParams = [...$deleteParams, ...$preparationIds];
    }

    $deleteStmt = $pdo->prepare($deleteSql);
    $deleteStmt->execute($deleteParams);

    if ($normalizedPreparations !== []) {
        $saveStmt = $pdo->prepare("
            INSERT INTO subject_preparations (
                subject_id,
                preparation_id,
                sort_order
            ) VALUES (
                :subject_id,
                :preparation_id,
                :sort_order
            )
            ON DUPLICATE KEY UPDATE
                sort_order = VALUES(sort_order)
        ");

        foreach ($normalizedPreparations as $preparation) {
            $saveStmt->execute([
                'subject_id' => $subjectId,
                'preparation_id' => $preparation['id'],
                'sort_order' => $preparation['sort_order'],
            ]);
        }
    }

    $pdo->commit();

    adminSuccessResponse(
        [
            'subject_id' => $subjectId,
            'preparations_total' => count($normalizedPreparations),
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
