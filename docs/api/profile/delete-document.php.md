<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/upload.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Удалять документы может только преподаватель', 403);
}

$data = getJsonInput();
$documentId = filter_var($data['document_id'] ?? null, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1],
]);

if ($documentId === false) {
    errorResponse('Некорректный ID документа');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $documentStmt = $pdo->prepare("
        SELECT id, file_url, status
        FROM teacher_documents
        WHERE id = :id
          AND teacher_id = :teacher_id
        LIMIT 1
        FOR UPDATE
    ");
    $documentStmt->execute([
        'id' => $documentId,
        'teacher_id' => $user['id'],
    ]);
    $document = $documentStmt->fetch(PDO::FETCH_ASSOC);

    if (!$document) {
        $pdo->rollBack();
        errorResponse('Документ не найден', 404);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM teacher_documents
        WHERE id = :id
          AND teacher_id = :teacher_id
    ");
    $deleteStmt->execute([
        'id' => $documentId,
        'teacher_id' => $user['id'],
    ]);

    $profileStmt = $pdo->prepare("
        UPDATE teacher_profiles
        SET is_verified = 0,
            verification_status = 'pending',
            verification_comment = NULL,
            verified_by = NULL,
            verified_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = :user_id
    ");
    $profileStmt->execute(['user_id' => $user['id']]);

    $pdo->commit();
    deleteStoredFile(uploadPrivateRoot(), $document['file_url']);

    successResponse([
        'message' => 'Документ удалён',
        'document_id' => (int) $documentId,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('delete-document.php: ' . $error->getMessage());
    errorResponse('Не удалось удалить документ', 500);
}
