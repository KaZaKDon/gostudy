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
    $rejectReason = trim($input['reject_reason'] ?? '');

    if ($documentId <= 0) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не передан ID документа',
        ], 400);
    }

    if ($rejectReason === '') {
        adminJsonResponse([
            'success' => false,
            'message' => 'Укажите причину отказа',
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
            status = 'rejected',
            reject_reason = :reject_reason,
            checked_by = :checked_by,
            checked_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'reject_reason' => $rejectReason,
        'checked_by' => (int) $admin['id'],
        'id' => $documentId,
    ]);

    writeAdminLog(
        $pdo,
        (int) $admin['id'],
        'teacher_document_rejected',
        'teacher_document',
        $documentId,
        $oldValue,
        [
            'status' => 'rejected',
            'reject_reason' => $rejectReason,
        ]
    );

    adminJsonResponse([
        'success' => true,
        'message' => 'Документ отклонён',
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка отклонения документа',
        'error' => $error->getMessage(),
    ], 500);
}