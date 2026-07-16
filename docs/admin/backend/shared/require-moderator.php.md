# shared/require-moderator.php

Проверка прав администратора или модератора.

<?php

declare(strict_types=1);

require_once __DIR__ . '/require-admin.php';

function requireAdminOrModerator(): array
{
    $pdo = getDatabaseConnection();
    $user = getCurrentAdminUser($pdo);

    if (
        !in_array(
            $user['role'] ?? '',
            ['admin', 'moderator'],
            true
        )
    ) {
        adminErrorResponse(
            'Доступ разрешён только администратору или модератору',
            403
        );
    }

    return [
        'pdo' => $pdo,
        'user' => $user,
    ];
}