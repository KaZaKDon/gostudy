# api/admin/auth/logout.php

Назначение: выход.

<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();

    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

session_destroy();

successResponse([
    'message' => 'Выход выполнен',
]);