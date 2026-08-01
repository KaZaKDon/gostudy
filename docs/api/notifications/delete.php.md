<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/notifications.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
$data = getJsonInput();
$notificationId = filter_var(
    $data['notification_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);

if ($notificationId === false) {
    errorResponse('Уведомление не выбрано');
}

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("
        DELETE FROM notifications
        WHERE id = :notification_id
          AND user_id = :user_id
    ");
    $stmt->execute([
        'notification_id' => (int) $notificationId,
        'user_id' => (int) $user['id'],
    ]);

    if ($stmt->rowCount() === 0) {
        errorResponse('Уведомление не найдено', 404);
    }

    successResponse([
        'deleted_count' => 1,
        'unread_count' => notificationUnreadCount($pdo, (int) $user['id']),
    ]);
} catch (Throwable $error) {
    error_log('notifications/delete.php: ' . $error->getMessage());
    errorResponse('Не удалось удалить уведомление', 500);
}