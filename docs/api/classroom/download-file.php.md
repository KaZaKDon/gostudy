<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/classroom.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
classroomRequireRole($user);

try {
    $fileId = classroomParsePositiveId($_GET['file_id'] ?? null, 'файл');
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("
        SELECT
            lf.lesson_id,
            lf.stored_path,
            lf.original_name,
            lf.mime_type,
            lf.file_size
        FROM lesson_files lf
        INNER JOIN lessons l ON l.id = lf.lesson_id
        WHERE lf.id = :file_id
          AND (
              l.teacher_id = :teacher_id
              OR l.student_id = :student_id
          )
        LIMIT 1
    ");
    $stmt->execute([
        'file_id' => $fileId,
        'teacher_id' => (int) $user['id'],
        'student_id' => (int) $user['id'],
    ]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        errorResponse('Материал не найден', 404);
    }

    $path = safeStoredPath(uploadPrivateRoot(), (string) $file['stored_path']);

    if ($path === null || !is_file($path)) {
        errorResponse('Файл материала отсутствует на сервере', 404);
    }

    $downloadName = str_replace(
        ["\r", "\n", '"'],
        '',
        (string) $file['original_name']
    );
    $encodedName = rawurlencode($downloadName);

    header('Content-Type: ' . (string) $file['mime_type']);
    header('Content-Length: ' . (string) filesize($path));
    header(
        "Content-Disposition: attachment; filename=\"download\"; filename*=UTF-8''{$encodedName}"
    );
    header('Cache-Control: private, no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');

    readfile($path);
    exit;
} catch (InvalidArgumentException $error) {
    errorResponse($error->getMessage());
} catch (Throwable $error) {
    error_log('classroom/download-file.php: ' . $error->getMessage());
    errorResponse('Не удалось скачать материал', 500);
}
