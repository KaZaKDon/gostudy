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
$messageText = trim((string) ($data['message_text'] ?? ''));

if ($messageText === '') {
    errorResponse('Введите сообщение');
}

if (mb_strlen($messageText) > 10000) {
    errorResponse('Сообщение не должно превышать 10 000 символов');
}

try {
    $pdo = getDatabaseConnection();
    $pair = messageRequireParticipantPair(
        $pdo,
        $user,
        $teacherId,
        $studentId
    );

    messageRequireChannelAvailable($pair, $channel, true);

    $pdo->beginTransaction();

    $dialog = messageFindDialog(
        $pdo,
        $teacherId,
        $studentId,
        $channel,
        true
    );

    if (!$dialog) {
        try {
            $createDialogStmt = $pdo->prepare("
                INSERT INTO dialogs (
                    teacher_id,
                    student_id,
                    channel_type
                ) VALUES (
                    :teacher_id,
                    :student_id,
                    :channel_type
                )
            ");

            $createDialogStmt->execute([
                'teacher_id' => $teacherId,
                'student_id' => $studentId,
                'channel_type' => $channel,
            ]);
        } catch (PDOException $error) {
            if ((string) $error->getCode() !== '23000') {
                throw $error;
            }
        }

        $dialog = messageFindDialog(
            $pdo,
            $teacherId,
            $studentId,
            $channel,
            true
        );
    }

    if (!$dialog) {
        throw new RuntimeException('Не удалось создать диалог');
    }

    $senderContext = messageSenderContext($user, $channel);

    $insertStmt = $pdo->prepare("
        INSERT INTO messages (
            dialog_id,
            sender_id,
            sender_context,
            message_text,
            is_read
        ) VALUES (
            :dialog_id,
            :sender_id,
            :sender_context,
            :message_text,
            0
        )
    ");

    $insertStmt->execute([
        'dialog_id' => (int) $dialog['id'],
        'sender_id' => (int) $user['id'],
        'sender_context' => $senderContext,
        'message_text' => $messageText,
    ]);

    $messageId = (int) $pdo->lastInsertId();

    $updateDialogStmt = $pdo->prepare("
        UPDATE dialogs
        SET last_message_at = CURRENT_TIMESTAMP
        WHERE id = :dialog_id
    ");

    $updateDialogStmt->execute([
        'dialog_id' => (int) $dialog['id'],
    ]);

    $messageStmt = $pdo->prepare("
        SELECT
            id,
            sender_id,
            sender_context,
            message_text,
            is_read,
            created_at
        FROM messages
        WHERE id = :message_id
        LIMIT 1
    ");

    $messageStmt->execute([
        'message_id' => $messageId,
    ]);

    $message = $messageStmt->fetch(PDO::FETCH_ASSOC);

    if (!$message) {
        throw new RuntimeException('Созданное сообщение не найдено');
    }

    $message['id'] = (int) $message['id'];
    $message['sender_id'] = (int) $message['sender_id'];
    $message['is_read'] = (bool) $message['is_read'];
    $message['author_name'] = messageAuthorName(
        $user,
        $pair,
        $senderContext
    );

    $recipientId = $user['role'] === 'teacher'
        ? $studentId
        : $teacherId;
    $messagePreview = mb_strlen($messageText) > 180
        ? mb_substr($messageText, 0, 177) . '...'
        : $messageText;

    notificationCreate(
        $pdo,
        $recipientId,
        'message_received',
        $channel === MESSAGE_CHANNEL_PARENT
            ? 'Новое сообщение в переписке с родителем'
            : 'Новое сообщение',
        $message['author_name'] . ': ' . $messagePreview,
        NOTIFICATION_SECTION_MESSAGES,
        'dialog',
        (int) $dialog['id']
    );

    $pdo->commit();

    successResponse([
        'message' => $message,
        'dialog_id' => (int) $dialog['id'],
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('messages/send.php: ' . $error->getMessage());
    errorResponse('Не удалось отправить сообщение', 500);
}
