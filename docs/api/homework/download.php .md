<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/homework.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
$attachmentId = homeworkParsePositiveId($_GET['id'] ?? null, 'файл');
$type = trim((string) ($_GET['type'] ?? ''));

if (!in_array($type, ['assignment', 'submission'], true)) {
    errorResponse('Некорректный тип файла');
}

try {
    $pdo = getDatabaseConnection();
    $participantColumn = $user['role'] === 'teacher'
        ? 'h.teacher_id'
        : 'h.student_id';

    if ($type === 'assignment') {
        $sql = "
            SELECT ha.stored_path, ha.original_name, ha.mime_type, ha.file_size
            FROM homework_attachments ha
            INNER JOIN homework h ON h.id = ha.homework_id
            WHERE ha.id = :attachment_id
              AND {$participantColumn} = :user_id
            LIMIT 1
        ";
    } else {
        $sql = "
            SELECT hsa.stored_path, hsa.original_name, hsa.mime_type, hsa.file_size
            FROM homework_submission_attachments hsa
            INNER JOIN homework_submissions hs ON hs.id = hsa.submission_id
            INNER JOIN homework h ON h.id = hs.homework_id
            WHERE hsa.id = :attachment_id
              AND {$participantColumn} = :user_id
            LIMIT 1
        ";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'attachment_id' => $attachmentId,
        'user_id' => (int) $user['id'],
    ]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        errorResponse('Файл не найден', 404);
    }

    $path = safeStoredPath(uploadPrivateRoot(), (string) $file['stored_path']);

    if ($path === null || !is_file($path)) {
        errorResponse('Файл отсутствует в хранилище', 404);
    }

    $fileName = str_replace(["\r", "\n", '"'], '', (string) $file['original_name']);
    header('Content-Type: ' . (string) $file['mime_type']);
    header('Content-Length: ' . filesize($path));
    header('X-Content-Type-Options: nosniff');
    header(
        "Content-Disposition: attachment; filename=\"file\"; filename*=UTF-8''"
        . rawurlencode($fileName)
    );
    readfile($path);
    exit;
} catch (Throwable $error) {
    error_log('homework/download.php: ' . $error->getMessage());
    errorResponse('Не удалось скачать файл', 500);
}