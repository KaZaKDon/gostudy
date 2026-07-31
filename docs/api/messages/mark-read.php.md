<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/messages.php';
require_once __DIR__ . '/../shared/notifications.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
messageRequireSupportedRole($user);

$data = getJsonInput();

$teacherId = messageParsePositiveId($data['teacher_id'] ?? null, 'teacher_id');
$studentId = messageParsePositiveId($data['student_id'] ?? null, 'student_id');
$channel = messageParseChannel($data['channel_type'] ?? null);

try {
    $pdo = getDatabaseConnection();

    messageRequireParticipantPair(
        $pdo,
        $user,
        $teacherId,
        $studentId
    );

    $dialog = messageFindDialog(
        $pdo,
        $teacherId,
        $studentId,
        $channel
    );

    if (!$dialog) {
        successResponse([
            'updated_count' => 0,
        ]);
    }

    $incomingCondition = $user['role'] === 'teacher'
        ? "sender_context IN ('student', 'parent')"
        : "sender_context = 'teacher'";

    $pdo->beginTransaction();

    $updateStmt = $pdo->prepare("
        UPDATE messages
        SET is_read = 1
        WHERE dialog_id = :dialog_id
          AND is_read = 0
          AND {$incomingCondition}
    ");

    $updateStmt->execute([
        'dialog_id' => (int) $dialog['id'],
    ]);

    notificationMarkEntityRead(
        $pdo,
        (int) $user['id'],
        'dialog',
        (int) $dialog['id']
    );

    $pdo->commit();

    successResponse([
        'updated_count' => $updateStmt->rowCount(),
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('messages/mark-read.php: ' . $error->getMessage());
    errorResponse('Не удалось отметить сообщения прочитанными', 500);
}
