# shared/require-admin.php

Проверка прав администратора.

<?php

declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/response.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function getCurrentAdminUser(PDO $pdo): array
{
    $userId = $_SESSION['user_id'] ?? null;

    if (
        filter_var(
            $userId,
            FILTER_VALIDATE_INT
        ) === false
        || (int) $userId <= 0
    ) {
        adminErrorResponse(
            'Не выполнен вход в систему',
            401
        );
    }

    $stmt = $pdo->prepare("
        SELECT
            id,
            email,
            role,
            status
        FROM users
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => (int) $userId,
    ]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        unset($_SESSION['user_id']);

        adminErrorResponse(
            'Пользователь не найден',
            401
        );
    }

    if (($user['status'] ?? '') !== 'active') {
        adminErrorResponse(
            'Аккаунт заблокирован или удалён',
            403
        );
    }

    $user['id'] = (int) $user['id'];

    return $user;
}

function requireAdmin(): array
{
    $pdo = getDatabaseConnection();
    $user = getCurrentAdminUser($pdo);

    if (($user['role'] ?? '') !== 'admin') {
        adminErrorResponse(
            'Доступ разрешён только администратору',
            403
        );
    }

    return [
        'pdo' => $pdo,
        'user' => $user,
    ];
}