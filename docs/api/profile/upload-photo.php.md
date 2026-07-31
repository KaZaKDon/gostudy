<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/upload.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Фото профиля может загружать только преподаватель', 403);
}

$file = receiveUploadedFile(
    'file',
    effectiveUploadMaxBytes('UPLOAD_PHOTO_MAX_BYTES', 5 * 1024 * 1024),
    [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ]
);

$imageInfo = @getimagesize($file['tmp_name']);

if ($imageInfo === false) {
    errorResponse('Файл не является корректным изображением');
}

$width = (int) ($imageInfo[0] ?? 0);
$height = (int) ($imageInfo[1] ?? 0);

if ($width < 300 || $height < 300) {
    errorResponse('Минимальный размер фотографии — 300 × 300 пикселей');
}

if ($width > 8000 || $height > 8000 || ($width * $height) > 40000000) {
    errorResponse('Разрешение фотографии слишком большое');
}

$storedPath = null;

try {
    $storedPath = storeUploadedFile(
        $file,
        uploadPublicRoot(),
        'teachers/' . $user['id'] . '/photo',
        0755,
        0644
    );
    $photoUrl = publicUrlFromStoredPath($storedPath);
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $oldPhotoStmt = $pdo->prepare("
        SELECT photo_url
        FROM teacher_profiles
        WHERE user_id = :user_id
        LIMIT 1
        FOR UPDATE
    ");
    $oldPhotoStmt->execute(['user_id' => $user['id']]);
    $oldPhotoUrl = $oldPhotoStmt->fetchColumn() ?: null;

    $profileStmt = $pdo->prepare("
        INSERT INTO teacher_profiles (
            user_id,
            slug,
            photo_url,
            profile_version
        ) VALUES (
            :user_id,
            :slug,
            :photo_url,
            2
        )
        ON DUPLICATE KEY UPDATE
            photo_url = VALUES(photo_url),
            is_verified = 0,
            verification_status = 'pending',
            verification_comment = NULL,
            verified_by = NULL,
            verified_at = NULL,
            profile_version = GREATEST(profile_version, 2),
            updated_at = CURRENT_TIMESTAMP
    ");
    $profileStmt->execute([
        'user_id' => $user['id'],
        'slug' => 'teacher-' . $user['id'],
        'photo_url' => $photoUrl,
    ]);

    $userStmt = $pdo->prepare("
        UPDATE users
        SET avatar_url = :avatar_url,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ");
    $userStmt->execute([
        'avatar_url' => $photoUrl,
        'id' => $user['id'],
    ]);

    $pdo->commit();

    $oldStoredPath = storedPathFromPublicUrl($oldPhotoUrl);

    if ($oldStoredPath !== null && $oldStoredPath !== $storedPath) {
        deleteStoredFile(uploadPublicRoot(), $oldStoredPath);
    }

    successResponse([
        'message' => 'Фото профиля загружено',
        'photo_url' => $photoUrl,
        'width' => $width,
        'height' => $height,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($storedPath !== null) {
        deleteStoredFile(uploadPublicRoot(), $storedPath);
    }

    error_log('upload-photo.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить фото профиля', 500);
}
