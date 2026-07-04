<?php

require_once __DIR__ . '/../shared/require-moderator.php';
require_once __DIR__ . '/../shared/admin-log.php';

$auth = requireAdminOrModerator();

$pdo = $auth['pdo'];
$admin = $auth['user'];

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        adminJsonResponse([
            'success' => false,
            'message' => 'Метод не поддерживается',
        ], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $documentId = (int) ($input['document_id'] ?? 0);

    if ($documentId <= 0) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не передан ID документа',
        ], 400);
    }

    $stmt = $pdo->prepare("
        SELECT *
        FROM teacher_documents
        WHERE id = :id
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

    $oldValue = [
        'status' => $document['status'],
    ];

    $updateStmt = $pdo->prepare("
        UPDATE teacher_documents
        SET
            status = 'approved',
            reject_reason = NULL,
            checked_by = :checked_by,
            checked_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'checked_by' => (int) $admin['id'],
        'id' => $documentId,
    ]);

    writeAdminLog(
        $pdo,
        (int) $admin['id'],
        'teacher_document_approved',
        'teacher_document',
        $documentId,
        $oldValue,
        [
            'status' => 'approved',
        ]
    );

    adminJsonResponse([
        'success' => true,
        'message' => 'Документ подтверждён',
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка подтверждения документа',
        'error' => $error->getMessage(),
    ], 500);
}