<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/classroom.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Удалять материалы может только преподаватель', 403);
}

$data = getJsonInput();

try {
    $lessonId = classroomParsePositiveId($data['lesson_id'] ?? null, 'урок');
    $fileId = classroomParsePositiveId($data['file_id'] ?? null, 'файл');
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $lesson = classroomFindLesson($pdo, $lessonId, $user, true);

    if (!$lesson) {
        errorResponse('Урок не найден', 404);
    }

    $session = classroomGetSession($pdo, $lessonId, true);
    $access = classroomAccess($lesson, $session, $user);

    if (!$access['can_manage_files']) {
        errorResponse(
            $access['reason'] ?: 'Сейчас материалы нельзя удалить',
            409
        );
    }

    $fileStmt = $pdo->prepare("
        SELECT stored_path
        FROM lesson_files
        WHERE id = :file_id
          AND lesson_id = :lesson_id
        LIMIT 1
        FOR UPDATE
    ");
    $fileStmt->execute([
        'file_id' => $fileId,
        'lesson_id' => $lessonId,
    ]);
    $storedPath = $fileStmt->fetchColumn();

    if ($storedPath === false) {
        errorResponse('Материал не найден', 404);
    }

    $stopSharingStmt = $pdo->prepare("
        UPDATE lesson_workspace_state
        SET
            is_sharing = 0,
            shared_file_id = NULL,
            shared_page = 1,
            updated_by = :teacher_id,
            version = version + 1
        WHERE lesson_id = :lesson_id
          AND shared_file_id = :file_id
    ");
    $stopSharingStmt->execute([
        'teacher_id' => (int) $user['id'],
        'lesson_id' => $lessonId,
        'file_id' => $fileId,
    ]);

    $deleteStmt = $pdo->prepare("
        DELETE FROM lesson_files
        WHERE id = :file_id
          AND lesson_id = :lesson_id
    ");
    $deleteStmt->execute([
        'file_id' => $fileId,
        'lesson_id' => $lessonId,
    ]);
    $pdo->commit();
    deleteStoredFile(uploadPrivateRoot(), (string) $storedPath);
    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);

    successResponse([
        'message' => 'Материал удалён',
        'files' => classroomLoadFiles($pdo, $lessonId, $viewerTimezone),
        'workspace' => classroomWorkspaceResponse(
            classroomGetWorkspaceState($pdo, $lessonId)
        ),
    ]);
} catch (InvalidArgumentException $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse($error->getMessage());
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('classroom/delete-file.php: ' . $error->getMessage());
    errorResponse('Не удалось удалить материал', 500);
}
