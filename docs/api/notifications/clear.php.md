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
$mode = trim((string) ($data['mode'] ?? ''));

if (!in_array($mode, ['read', 'all'], true)) {
    errorResponse('Некорректный режим очистки');
}

try {
    $pdo = getDatabaseConnection();
    $readCondition = $mode === 'read' ? 'AND is_read = 1' : '';
    $stmt = $pdo->prepare("
        DELETE FROM notifications
        WHERE user_id = :user_id
          {$readCondition}
    ");
    $stmt->execute([
        'user_id' => (int) $user['id'],
    ]);

    successResponse([
        'deleted_count' => $stmt->rowCount(),
        'unread_count' => notificationUnreadCount($pdo, (int) $user['id']),
    ]);
} catch (Throwable $error) {
    error_log('notifications/clear.php: ' . $error->getMessage());
    errorResponse('Не удалось очистить уведомления', 500);
}