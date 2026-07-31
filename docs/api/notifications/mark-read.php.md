<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
$data = getJsonInput();

$markAll = filter_var(
    $data['mark_all'] ?? false,
    FILTER_VALIDATE_BOOL
);
$notificationId = filter_var(
    $data['notification_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);

if (!$markAll && $notificationId === false) {
    errorResponse('Уведомление не выбрано');
}

try {
    $pdo = getDatabaseConnection();

    if ($markAll) {
        $stmt = $pdo->prepare("
            UPDATE notifications
            SET is_read = 1,
                read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
            WHERE user_id = :user_id
              AND is_read = 0
        ");
        $stmt->execute([
            'user_id' => (int) $user['id'],
        ]);
    } else {
        $stmt = $pdo->prepare("
            UPDATE notifications
            SET is_read = 1,
                read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
            WHERE id = :notification_id
              AND user_id = :user_id
        ");
        $stmt->execute([
            'notification_id' => (int) $notificationId,
            'user_id' => (int) $user['id'],
        ]);

        if ($stmt->rowCount() === 0) {
            $existsStmt = $pdo->prepare("
                SELECT id
                FROM notifications
                WHERE id = :lookup_notification_id
                  AND user_id = :lookup_user_id
                LIMIT 1
            ");
            $existsStmt->execute([
                'lookup_notification_id' => (int) $notificationId,
                'lookup_user_id' => (int) $user['id'],
            ]);

            if (!$existsStmt->fetchColumn()) {
                errorResponse('Уведомление не найдено', 404);
            }
        }
    }

    $countStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM notifications
        WHERE user_id = :count_user_id
          AND is_read = 0
    ");
    $countStmt->execute([
        'count_user_id' => (int) $user['id'],
    ]);

    successResponse([
        'updated_count' => $stmt->rowCount(),
        'unread_count' => (int) $countStmt->fetchColumn(),
    ]);
} catch (Throwable $error) {
    error_log('notifications/mark-read.php: ' . $error->getMessage());
    errorResponse('Не удалось обновить уведомления', 500);
}
