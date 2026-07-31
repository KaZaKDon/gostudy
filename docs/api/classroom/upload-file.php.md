<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/classroom.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Добавлять материалы может только преподаватель', 403);
}

classroomValidateMultipartRequestSize();

try {
    $lessonId = classroomParsePositiveId($_POST['lesson_id'] ?? null, 'урок');
    $files = classroomReceiveFiles();

    if ($files === []) {
        errorResponse('Выберите хотя бы один файл');
    }

    $pdo = getDatabaseConnection();
    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);
    $lesson = classroomFindLesson($pdo, $lessonId, $user);

    if (!$lesson) {
        errorResponse('Урок не найден', 404);
    }

    $session = classroomGetSession($pdo, $lessonId);
    $access = classroomAccess($lesson, $session, $user);

    if (!$access['can_manage_files']) {
        errorResponse(
            $access['reason'] ?: 'Сейчас материалы нельзя добавить',
            409
        );
    }

    $sizeStmt = $pdo->prepare("
        SELECT COALESCE(SUM(file_size), 0)
        FROM lesson_files
        WHERE lesson_id = :lesson_id
    ");
    $sizeStmt->execute(['lesson_id' => $lessonId]);
    $currentBytes = (int) $sizeStmt->fetchColumn();
    $newBytes = array_sum(array_map(
        static fn (array $file): int => (int) $file['size'],
        $files
    ));
    $lessonMaxBytes = classroomUploadLimits()['lesson_max_bytes'];

    if ($currentBytes + $newBytes > $lessonMaxBytes) {
        errorResponse(
            'Общий размер материалов урока не должен превышать '
                . round($lessonMaxBytes / 1024 / 1024, 1)
                . ' МБ',
            413
        );
    }

    $storedPaths = [];
    $pdo->beginTransaction();
    $insertStmt = $pdo->prepare("
        INSERT INTO lesson_files (
            lesson_id,
            uploaded_by,
            stored_path,
            original_name,
            mime_type,
            file_size
        ) VALUES (
            :lesson_id,
            :uploaded_by,
            :stored_path,
            :original_name,
            :mime_type,
            :file_size
        )
    ");

    foreach ($files as $file) {
        $storedPath = storeUploadedFile(
            $file,
            uploadPrivateRoot(),
            'classroom/' . $lessonId . '/materials'
        );
        $storedPaths[] = $storedPath;
        $insertStmt->execute([
            'lesson_id' => $lessonId,
            'uploaded_by' => (int) $user['id'],
            'stored_path' => $storedPath,
            'original_name' => $file['original_name'],
            'mime_type' => $file['mime_type'],
            'file_size' => $file['size'],
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => count($files) === 1
            ? 'Материал добавлен'
            : 'Материалы добавлены',
        'files' => classroomLoadFiles($pdo, $lessonId, $viewerTimezone),
    ]);
} catch (InvalidArgumentException $error) {
    errorResponse($error->getMessage());
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    foreach ($storedPaths ?? [] as $storedPath) {
        deleteStoredFile(uploadPrivateRoot(), (string) $storedPath);
    }

    error_log('classroom/upload-file.php: ' . $error->getMessage());
    errorResponse('Не удалось добавить материалы', 500);
}
