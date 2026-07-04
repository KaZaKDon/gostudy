# api/admin/auth/me.php

Назначение: проверка текущей сессии.

<?php

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();

adminJsonResponse([
    'success' => true,
    'data' => [
        'user' => $auth['user'],
    ],
]);