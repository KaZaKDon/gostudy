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
    errorResponse('Остановить показ может только преподаватель', 403);
}

$data = getJsonInput();

try {
    $lessonId = classroomParsePositiveId($data['lesson_id'] ?? null, 'урок');
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $lesson = classroomFindLesson($pdo, $lessonId, $user, true);

    if (!$lesson) {
        errorResponse('Урок не найден', 404);
    }

    $session = classroomGetSession($pdo, $lessonId, true);

    if (($session['status'] ?? null) === 'ended') {
        errorResponse('Урок уже завершён', 409);
    }

    classroomEnsureWorkspaceState($pdo, $lessonId);
    $stopStmt = $pdo->prepare("
        UPDATE lesson_workspace_state
        SET
            is_sharing = 0,
            shared_file_id = NULL,
            shared_page = 1,
            updated_by = :teacher_id,
            version = version + 1
        WHERE lesson_id = :lesson_id
    ");
    $stopStmt->execute([
        'teacher_id' => (int) $user['id'],
        'lesson_id' => $lessonId,
    ]);
    $workspace = classroomGetWorkspaceState($pdo, $lessonId, true);
    $pdo->commit();

    successResponse([
        'message' => 'Показ материала остановлен',
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

    error_log('classroom/stop-material-sharing.php: ' . $error->getMessage());
    errorResponse('Не удалось остановить показ материала', 500);
}
