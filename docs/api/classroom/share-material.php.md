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
    errorResponse('Управлять показом может только преподаватель', 403);
}

$data = getJsonInput();

try {
    $lessonId = classroomParsePositiveId($data['lesson_id'] ?? null, 'урок');
    $fileId = classroomParsePositiveId($data['file_id'] ?? null, 'файл');
    $page = filter_var(
        $data['page'] ?? 1,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1, 'max_range' => 100000]]
    );

    if ($page === false) {
        errorResponse('Укажите корректную страницу материала');
    }

    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $lesson = classroomFindLesson($pdo, $lessonId, $user, true);

    if (!$lesson) {
        errorResponse('Урок не найден', 404);
    }

    $session = classroomGetSession($pdo, $lessonId, true);
    $access = classroomAccess($lesson, $session, $user);

    if (!$access['can_share_material']) {
        errorResponse(
            $access['reason'] ?: 'Показ доступен только во время урока',
            409
        );
    }

    $fileStmt = $pdo->prepare("
        SELECT id
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

    if (!$fileStmt->fetchColumn()) {
        errorResponse('Материал не найден', 404);
    }

    classroomEnsureWorkspaceState($pdo, $lessonId);
    $shareStmt = $pdo->prepare("
        UPDATE lesson_workspace_state
        SET
            version = version + IF(
                is_sharing = 0 OR shared_file_id <> :comparison_file_id,
                1,
                0
            ),
            is_sharing = 1,
            shared_file_id = :file_id,
            shared_page = :shared_page,
            updated_by = :teacher_id
        WHERE lesson_id = :lesson_id
    ");
    $shareStmt->execute([
        'file_id' => $fileId,
        'comparison_file_id' => $fileId,
        'shared_page' => (int) $page,
        'teacher_id' => (int) $user['id'],
        'lesson_id' => $lessonId,
    ]);
    $workspace = classroomGetWorkspaceState($pdo, $lessonId, true);
    $pdo->commit();

    successResponse([
        'message' => 'Материал показан ученику',
        'workspace' => classroomWorkspaceResponse($workspace),
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

    error_log('classroom/share-material.php: ' . $error->getMessage());
    errorResponse('Не удалось включить показ материала', 500);
}
