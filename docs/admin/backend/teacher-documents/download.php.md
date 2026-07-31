<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/require-moderator.php';
require_once __DIR__ . '/../../shared/upload.php';

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];
$documentId = (int) ($_GET['id'] ?? 0);

if ($documentId <= 0) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Не передан ID документа',
    ], 400);
}

try {
    $stmt = $pdo->prepare("
        SELECT
            id,
            file_url,
            original_name,
            mime_type,
            file_size
        FROM teacher_documents
        WHERE id = :id
        LIMIT 1
    ");
    $stmt->execute(['id' => $documentId]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$document) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Документ не найден',
        ], 404);
    }

    $path = safeStoredPath(uploadPrivateRoot(), (string) $document['file_url']);

    if ($path === null || !is_file($path)) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Файл документа отсутствует в хранилище',
        ], 404);
    }

    $originalName = preg_replace(
        '/[\x00-\x1F\x7F]/u',
        '',
        (string) ($document['original_name'] ?: ('document-' . $documentId))
    );
    $mimeType = (string) ($document['mime_type'] ?: 'application/octet-stream');

    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . filesize($path));
    header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($originalName));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store, max-age=0');
    header('Pragma: no-cache');

    readfile($path);
    exit;
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка загрузки документа',
    ], 500);
}
