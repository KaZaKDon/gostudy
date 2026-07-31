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
classroomRequireRole($user);
$data = getJsonInput();

try {
    $lessonId = classroomParsePositiveId($data['lesson_id'] ?? null, 'урок');
    $afterMessageId = isset($data['after_message_id'])
        ? max(0, (int) $data['after_message_id'])
        : 0;
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $lesson = classroomFindLesson($pdo, $lessonId, $user, true);

    if (!$lesson) {
        errorResponse('Урок не найден', 404);
    }

    $session = classroomGetSession($pdo, $lessonId, true);
    $access = classroomAccess($lesson, $session, $user);

    if ($access['can_join']) {
        if (!$session) {
            $session = classroomEnsureSession($pdo, $lessonId);
        }

        classroomTouchPresence($pdo, $lessonId, (string) $user['role']);
        $session = classroomGetSession($pdo, $lessonId, true);
        $access = classroomAccess($lesson, $session, $user);
    }

    $pdo->commit();
    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);

    successResponse([
        'session' => classroomSessionResponse(
            $session,
            $lesson,
            $viewerTimezone
        ),
        'access' => classroomAccessResponse($access, $viewerTimezone),
        'workspace' => classroomWorkspaceResponse(
            classroomGetWorkspaceState($pdo, $lessonId)
        ),
        'files' => classroomLoadFiles($pdo, $lessonId, $viewerTimezone),
        'messages' => classroomLoadMessages(
            $pdo,
            $lessonId,
            $viewerTimezone,
            (int) $user['id'],
            $afterMessageId,
            CLASSROOM_SYNC_MESSAGE_LIMIT
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

    error_log('classroom/sync.php: ' . $error->getMessage());
    errorResponse('Не удалось обновить состояние класса', 500);
}
