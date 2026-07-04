# shared/require-moderator.php

Проверка прав администратора или модератора.

<?php

require_once __DIR__ . '/require-admin.php';

function requireAdminOrModerator(): array
{
    $pdo = getDatabaseConnection();
    $user = getCurrentAdminUser($pdo);

    if (!in_array(($user['role'] ?? ''), ['admin', 'moderator'], true)) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Доступ разрешён только администратору или модератору',
        ], 403);
    }

    return [
        'pdo' => $pdo,
        'user' => $user,
    ];
}