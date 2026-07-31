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
    errorResponse('Завершить урок может только преподаватель', 403);
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
        $completeStmt = $pdo->prepare("
            UPDATE lessons
            SET status = 'completed'
            WHERE id = :lesson_id
              AND status IN ('scheduled', 'rescheduled')
        ");
        $completeStmt->execute(['lesson_id' => $lessonId]);
    } else {
        if (!$session || $session['status'] !== 'active') {
            errorResponse('Сначала начните урок', 409);
        }

        $finishStmt = $pdo->prepare("
            UPDATE lesson_sessions
            SET
                status = 'ended',
                ended_by = :teacher_id,
                ended_at = COALESCE(ended_at, CURRENT_TIMESTAMP),
                teacher_last_seen_at = CURRENT_TIMESTAMP
            WHERE lesson_id = :lesson_id
              AND status = 'active'
        ");
        $finishStmt->execute([
            'teacher_id' => (int) $user['id'],
            'lesson_id' => $lessonId,
        ]);

        $completeStmt = $pdo->prepare("
            UPDATE lessons
            SET status = 'completed'
            WHERE id = :lesson_id
              AND status IN ('scheduled', 'rescheduled')
        ");
        $completeStmt->execute(['lesson_id' => $lessonId]);
    }

    $lesson['status'] = 'completed';
    $stopSharingStmt = $pdo->prepare("
        UPDATE lesson_workspace_state
        SET
            is_sharing = 0,
            shared_file_id = NULL,
            shared_page = 1,
            updated_by = :teacher_id,
            version = version + 1
        WHERE lesson_id = :lesson_id
          AND is_sharing = 1
    ");
    $stopSharingStmt->execute([
        'teacher_id' => (int) $user['id'],
        'lesson_id' => $lessonId,
    ]);
    $session = classroomGetSession($pdo, $lessonId, true);
    $access = classroomAccess($lesson, $session, $user);
    $pdo->commit();
    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);

    successResponse([
        'message' => 'Урок завершён',
        'session' => classroomSessionResponse(
            $session,
            $lesson,
            $viewerTimezone
        ),
        'access' => classroomAccessResponse($access, $viewerTimezone),
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

    error_log('classroom/finish.php: ' . $error->getMessage());
    errorResponse('Не удалось завершить урок', 500);
}
