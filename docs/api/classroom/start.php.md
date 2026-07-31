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
    errorResponse('Начать урок может только преподаватель', 403);
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
    $access = classroomAccess($lesson, $session, $user);

    if (($session['status'] ?? null) === 'active') {
        classroomTouchPresence($pdo, $lessonId, 'teacher');
    } else {
        if (!$access['can_start']) {
            errorResponse(
                $access['reason'] ?: 'Сейчас этот урок нельзя начать',
                409
            );
        }

        if (!$session) {
            $session = classroomEnsureSession($pdo, $lessonId);
        }

        $startStmt = $pdo->prepare("
            UPDATE lesson_sessions
            SET
                status = 'active',
                started_by = :teacher_id,
                started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                teacher_joined_at = COALESCE(
                    teacher_joined_at,
                    CURRENT_TIMESTAMP
                ),
                teacher_last_seen_at = CURRENT_TIMESTAMP
            WHERE lesson_id = :lesson_id
              AND status = 'waiting'
        ");
        $startStmt->execute([
            'teacher_id' => (int) $user['id'],
            'lesson_id' => $lessonId,
        ]);
    }

    $session = classroomGetSession($pdo, $lessonId, true);
    $access = classroomAccess($lesson, $session, $user);
    $pdo->commit();
    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);

    successResponse([
        'message' => 'Урок начат',
        'session' => classroomSessionResponse(
            $session,
            $lesson,
            $viewerTimezone
        ),
        'access' => classroomAccessResponse($access, $viewerTimezone),
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

    error_log('classroom/start.php: ' . $error->getMessage());
    errorResponse('Не удалось начать урок', 500);
}
