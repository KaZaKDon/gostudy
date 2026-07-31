<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

$limit = filter_var(
    $_GET['limit'] ?? 20,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1, 'max_range' => 50]]
);
$beforeId = filter_var(
    $_GET['before_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);

if ($limit === false) {
    errorResponse('Некорректный размер страницы');
}

if (isset($_GET['before_id']) && $beforeId === false) {
    errorResponse('Некорректный указатель страницы');
}

try {
    $pdo = getDatabaseConnection();

    $beforeSql = $beforeId === false || $beforeId === null
        ? ''
        : 'AND id < :before_id';

    $stmt = $pdo->prepare("
        SELECT
            id,
            type,
            title,
            message,
            target_section,
            target_entity_type,
            target_entity_id,
            target_date,
            is_read,
            read_at,
            created_at
        FROM notifications
        WHERE user_id = :user_id
          {$beforeSql}
        ORDER BY id DESC
        LIMIT :result_limit
    ");

    $stmt->bindValue(':user_id', (int) $user['id'], PDO::PARAM_INT);

    if ($beforeId !== false && $beforeId !== null) {
        $stmt->bindValue(':before_id', (int) $beforeId, PDO::PARAM_INT);
    }

    $stmt->bindValue(':result_limit', (int) $limit + 1, PDO::PARAM_INT);
    $stmt->execute();

    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $hasMore = count($notifications) > $limit;

    if ($hasMore) {
        array_pop($notifications);
    }

    foreach ($notifications as &$notification) {
        $notification['id'] = (int) $notification['id'];
        $notification['target_entity_id'] = $notification['target_entity_id'] !== null
            ? (int) $notification['target_entity_id']
            : null;
        $notification['is_read'] = (bool) $notification['is_read'];
    }
    unset($notification);

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
        'notifications' => $notifications,
        'unread_count' => (int) $countStmt->fetchColumn(),
        'has_more' => $hasMore,
        'next_before_id' => $hasMore && $notifications
            ? (int) end($notifications)['id']
            : null,
    ]);
} catch (Throwable $error) {
    error_log('notifications/index.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить уведомления', 500);
}
