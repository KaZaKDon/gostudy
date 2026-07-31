<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/messages.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
messageRequireSupportedRole($user);

$teacherId = messageParsePositiveId($_GET['teacher_id'] ?? null, 'teacher_id');
$studentId = messageParsePositiveId($_GET['student_id'] ?? null, 'student_id');
$channel = messageParseChannel($_GET['channel_type'] ?? null);

$beforeId = null;

if (isset($_GET['before_id']) && $_GET['before_id'] !== '') {
    $beforeId = messageParsePositiveId($_GET['before_id'], 'before_id');
}

$limit = filter_var(
    $_GET['limit'] ?? 50,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1, 'max_range' => 100]]
);

if ($limit === false) {
    errorResponse('Некорректно указано количество сообщений');
}

try {
    $pdo = getDatabaseConnection();
    $pair = messageRequireParticipantPair(
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
            'dialog_id' => null,
            'messages' => [],
            'has_more' => false,
            'next_before_id' => null,
            'can_send' => (bool) $pair['can_send']
                && ($channel !== MESSAGE_CHANNEL_PARENT || $pair['parent_name'] !== ''),
        ]);
    }

    $beforeCondition = $beforeId !== null
        ? ' AND m.id < :before_id'
        : '';

    $fetchLimit = (int) $limit + 1;

    $messagesStmt = $pdo->prepare("
        SELECT
            m.id,
            m.sender_id,
            m.sender_context,
            m.message_text,
            m.is_read,
            m.created_at,
            CASE
                WHEN m.sender_context = 'parent'
                    THEN COALESCE(NULLIF(TRIM(sp.parent_name), ''), 'Родитель ученика')
                ELSE sender.full_name
            END AS author_name
        FROM messages m
        INNER JOIN users sender
            ON sender.id = m.sender_id
        LEFT JOIN student_profiles sp
            ON sp.user_id = :profile_student_id
        WHERE m.dialog_id = :dialog_id
        {$beforeCondition}
        ORDER BY m.id DESC
        LIMIT {$fetchLimit}
    ");

    $parameters = [
        'profile_student_id' => $studentId,
        'dialog_id' => (int) $dialog['id'],
    ];

    if ($beforeId !== null) {
        $parameters['before_id'] = $beforeId;
    }

    $messagesStmt->execute($parameters);
    $messages = $messagesStmt->fetchAll(PDO::FETCH_ASSOC);
    $hasMore = count($messages) > (int) $limit;

    if ($hasMore) {
        array_pop($messages);
    }

    $messages = array_reverse($messages);

    foreach ($messages as &$message) {
        $message['id'] = (int) $message['id'];
        $message['sender_id'] = (int) $message['sender_id'];
        $message['is_read'] = (bool) $message['is_read'];
    }
    unset($message);

    successResponse([
        'dialog_id' => (int) $dialog['id'],
        'messages' => $messages,
        'has_more' => $hasMore,
        'next_before_id' => $hasMore && $messages
            ? (int) $messages[0]['id']
            : null,
        'can_send' => (bool) $pair['can_send']
            && ($channel !== MESSAGE_CHANNEL_PARENT || $pair['parent_name'] !== ''),
    ]);
} catch (Throwable $error) {
    error_log('messages/thread.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить переписку', 500);
}
