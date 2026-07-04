<?php

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();

$pdo = $auth['pdo'];

try {
    $documentId = (int) ($_GET['id'] ?? 0);

    if ($documentId <= 0) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не передан ID документа',
        ], 400);
    }

    $stmt = $pdo->prepare("
        SELECT
            td.id,
            td.teacher_id,
            td.type,
            td.file_url,
            td.original_name,
            td.status,
            td.reject_reason,
            td.checked_by,
            td.checked_at,
            td.created_at,
            td.updated_at,

            u.full_name,
            u.email,
            u.phone,

            checker.full_name AS checked_by_name

        FROM teacher_documents td

        INNER JOIN users u
            ON u.id = td.teacher_id

        LEFT JOIN users checker
            ON checker.id = td.checked_by

        WHERE td.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $documentId,
    ]);

    $document = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$document) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Документ не найден',
        ], 404);
    }

    adminJsonResponse([
        'success' => true,
        'data' => [
            'document' => $document,
        ],
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка получения документа',
        'error' => $error->getMessage(),
    ], 500);
}