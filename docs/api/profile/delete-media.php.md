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
    errorResponse('Изменять файлы профиля может только преподаватель', 403);
}

$data = getJsonInput();
$type = trim((string) ($data['type'] ?? ''));

if (!in_array($type, ['photo', 'video'], true)) {
    errorResponse('Некорректный тип файла');
}

$column = $type === 'photo' ? 'photo_url' : 'intro_video_url';

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $selectStmt = $pdo->prepare("
        SELECT {$column}
        FROM teacher_profiles
        WHERE user_id = :user_id
        LIMIT 1
        FOR UPDATE
    ");
    $selectStmt->execute(['user_id' => $user['id']]);
    $fileUrl = $selectStmt->fetchColumn() ?: null;

    $updateStmt = $pdo->prepare("
        UPDATE teacher_profiles
        SET {$column} = NULL,
            is_verified = 0,
            verification_status = 'pending',
            verification_comment = NULL,
            verified_by = NULL,
            verified_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = :user_id
    ");
    $updateStmt->execute(['user_id' => $user['id']]);

    if ($type === 'photo') {
        $userStmt = $pdo->prepare("
            UPDATE users
            SET avatar_url = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        $userStmt->execute(['id' => $user['id']]);
    }

    $pdo->commit();

    $storedPath = storedPathFromPublicUrl($fileUrl);

    if ($storedPath !== null) {
        deleteStoredFile(uploadPublicRoot(), $storedPath);
    }

    successResponse([
        'message' => $type === 'photo'
            ? 'Фото профиля удалено'
            : 'Видеовизитка удалена',
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('delete-media.php: ' . $error->getMessage());
    errorResponse('Не удалось удалить файл', 500);
}
