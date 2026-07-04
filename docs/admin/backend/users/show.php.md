# api/admin/users/show.php

Назначение: карточка пользователя.

Статус: ✅ Реализован.

<?php

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];

try {
    $userId = (int) ($_GET['id'] ?? 0);

    if ($userId <= 0) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не передан ID пользователя',
        ], 400);
    }

    $stmt = $pdo->prepare("
        SELECT
            id,
            full_name,
            email,
            phone,
            role,
            status,
            blocked_reason,
            last_login_at,
            created_at,
            updated_at
        FROM users
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $userId,
    ]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Пользователь не найден',
        ], 404);
    }

    $stats = [
        'requests_total' => 0,
        'lessons_total' => 0,
        'homework_total' => 0,
        'messages_total' => 0,
    ];

    $requestsStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM teacher_student_requests
        WHERE student_id = :user_id OR teacher_id = :user_id
    ");
    $requestsStmt->execute(['user_id' => $userId]);
    $stats['requests_total'] = (int) $requestsStmt->fetchColumn();

    $lessonsStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM lessons
        WHERE student_id = :user_id OR teacher_id = :user_id
    ");
    $lessonsStmt->execute(['user_id' => $userId]);
    $stats['lessons_total'] = (int) $lessonsStmt->fetchColumn();

    $homeworkStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM homework
        WHERE student_id = :user_id OR teacher_id = :user_id
    ");
    $homeworkStmt->execute(['user_id' => $userId]);
    $stats['homework_total'] = (int) $homeworkStmt->fetchColumn();

    $messagesStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM messages
        WHERE sender_id = :user_id
    ");
    $messagesStmt->execute(['user_id' => $userId]);
    $stats['messages_total'] = (int) $messagesStmt->fetchColumn();

    adminJsonResponse([
        'success' => true,
        'data' => [
            'user' => $user,
            'stats' => $stats,
        ],
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка получения карточки пользователя',
        'error' => $error->getMessage(),
    ], 500);
}