<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/classroom.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
classroomRequireRole($user);

try {
    $lessonId = classroomParsePositiveId($_GET['lesson_id'] ?? null, 'урок');
    $pdo = getDatabaseConnection();
    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);
    $lesson = classroomFindLesson($pdo, $lessonId, $user);

    if (!$lesson) {
        errorResponse('Урок не найден', 404);
    }

    $session = classroomGetSession($pdo, $lessonId);
    $access = classroomAccess($lesson, $session, $user);

    successResponse([
        'viewer' => [
            'id' => (int) $user['id'],
            'role' => (string) $user['role'],
            'name' => (string) $user['full_name'],
        ],
        'lesson' => classroomLessonResponse($lesson, $viewerTimezone),
        'session' => classroomSessionResponse(
            $session,
            $lesson,
            $viewerTimezone
        ),
        'access' => classroomAccessResponse($access, $viewerTimezone),
        'workspace' => classroomWorkspaceResponse(
            classroomGetWorkspaceState($pdo, $lessonId)
        ),
        'messages' => classroomLoadMessages(
            $pdo,
            $lessonId,
            $viewerTimezone,
            (int) $user['id']
        ),
        'files' => classroomLoadFiles($pdo, $lessonId, $viewerTimezone),
        'homework' => classroomLoadHomework($pdo, $lessonId, $viewerTimezone),
        'teacher_note' => $user['role'] === 'teacher'
            ? classroomLoadTeacherNote($pdo, $lessonId)
            : null,
        'upload_limits' => classroomUploadLimits(),
        'timezone' => $viewerTimezone->getName(),
    ]);
} catch (InvalidArgumentException $error) {
    errorResponse($error->getMessage());
} catch (Throwable $error) {
    error_log('classroom/show.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить класс', 500);
}
