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
    $messageText = trim((string) ($data['message_text'] ?? ''));

    if ($messageText === '') {
        errorResponse('Введите сообщение');
    }

    if (mb_strlen($messageText) > CLASSROOM_MESSAGE_MAX_LENGTH) {
        errorResponse(
            'Сообщение не должно превышать '
                . CLASSROOM_MESSAGE_MAX_LENGTH
                . ' символов'
        );
    }

    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $lesson = classroomFindLesson($pdo, $lessonId, $user, true);

    if (!$lesson) {
        errorResponse('Урок не найден', 404);
    }

    $session = classroomGetSession($pdo, $lessonId, true);
    $access = classroomAccess($lesson, $session, $user);

    if (!$access['can_chat']) {
        errorResponse($access['reason'] ?: 'Чат урока недоступен', 409);
    }

    if (!$session) {
        classroomEnsureSession($pdo, $lessonId);
    }

    classroomTouchPresence($pdo, $lessonId, (string) $user['role']);
    $insertStmt = $pdo->prepare("
        INSERT INTO lesson_messages (
            lesson_id,
            sender_id,
            message_text
        ) VALUES (
            :lesson_id,
            :sender_id,
            :message_text
        )
    ");
    $insertStmt->execute([
        'lesson_id' => $lessonId,
        'sender_id' => (int) $user['id'],
        'message_text' => $messageText,
    ]);
    $messageId = (int) $pdo->lastInsertId();
    $pdo->commit();
    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);
    $messageStmt = $pdo->prepare("
        SELECT
            lm.id,
            lm.sender_id,
            lm.message_text,
            lm.created_at,
            senders.full_name AS sender_name,
            senders.role AS sender_role
        FROM lesson_messages lm
        INNER JOIN users senders ON senders.id = lm.sender_id
        WHERE lm.id = :message_id
        LIMIT 1
    ");
    $messageStmt->execute(['message_id' => $messageId]);
    $message = $messageStmt->fetch(PDO::FETCH_ASSOC);

    successResponse([
        'message' => classroomMessageResponse(
            $message,
            $viewerTimezone,
            (int) $user['id']
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

    error_log('classroom/send-message.php: ' . $error->getMessage());
    errorResponse('Не удалось отправить сообщение', 500);
}
