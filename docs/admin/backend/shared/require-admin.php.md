# shared/require-admin.php

Проверка прав администратора.

<?php

require_once __DIR__ . '/../../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function adminJsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getCurrentAdminUser(PDO $pdo): array
{
    $userId = $_SESSION['user_id'] ?? null;

    if (!$userId) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не выполнен вход в систему',
        ], 401);
    }

    $stmt = $pdo->prepare("
        SELECT id, email, role, status
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
        ], 401);
    }

    if (($user['status'] ?? '') !== 'active') {
        adminJsonResponse([
            'success' => false,
            'message' => 'Аккаунт заблокирован или удалён',
        ], 403);
    }

    return $user;
}

function requireAdmin(): array
{
    $pdo = getDatabaseConnection();
    $user = getCurrentAdminUser($pdo);

    if (($user['role'] ?? '') !== 'admin') {
        adminJsonResponse([
            'success' => false,
            'message' => 'Доступ разрешён только администратору',
        ], 403);
    }

    return [
        'pdo' => $pdo,
        'user' => $user,
    ];
}