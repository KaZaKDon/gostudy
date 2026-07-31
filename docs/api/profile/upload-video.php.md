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
    errorResponse('Видеовизитку может загружать только преподаватель', 403);
}

$file = receiveUploadedFile(
    'file',
    effectiveUploadMaxBytes('UPLOAD_VIDEO_MAX_BYTES', 100 * 1024 * 1024),
    [
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
    ]
);

$storedPath = null;

try {
    $storedPath = storeUploadedFile(
        $file,
        uploadPublicRoot(),
        'teachers/' . $user['id'] . '/video',
        0755,
        0644
    );
    $videoUrl = publicUrlFromStoredPath($storedPath);
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $oldVideoStmt = $pdo->prepare("
        SELECT intro_video_url
        FROM teacher_profiles
        WHERE user_id = :user_id
        LIMIT 1
        FOR UPDATE
    ");
    $oldVideoStmt->execute(['user_id' => $user['id']]);
    $oldVideoUrl = $oldVideoStmt->fetchColumn() ?: null;

    $profileStmt = $pdo->prepare("
        INSERT INTO teacher_profiles (
            user_id,
            slug,
            intro_video_url,
            profile_version
        ) VALUES (
            :user_id,
            :slug,
            :intro_video_url,
            2
        )
        ON DUPLICATE KEY UPDATE
            intro_video_url = VALUES(intro_video_url),
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
        'intro_video_url' => $videoUrl,
    ]);

    $pdo->commit();

    $oldStoredPath = storedPathFromPublicUrl($oldVideoUrl);

    if ($oldStoredPath !== null && $oldStoredPath !== $storedPath) {
        deleteStoredFile(uploadPublicRoot(), $oldStoredPath);
    }

    successResponse([
        'message' => 'Видеовизитка загружена',
        'intro_video_url' => $videoUrl,
        'mime_type' => $file['mime_type'],
        'file_size' => $file['size'],
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($storedPath !== null) {
        deleteStoredFile(uploadPublicRoot(), $storedPath);
    }

    error_log('upload-video.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить видеовизитку', 500);
}
