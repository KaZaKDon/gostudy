# api/admin/auth/login.php

Назначение: авторизация администратора/модератора.

<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';
require_once __DIR__ . '/../../shared/json.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$data = getJsonInput();

$email = mb_strtolower(trim($data['email'] ?? ''));
$password = (string) ($data['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Некорректный email');
}

if ($password === '') {
    errorResponse('Укажите пароль');
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            role,
            email,
            password_hash,
            full_name,
            status
        FROM users
        WHERE email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        errorResponse('Неверный email или пароль', 401);
    }

    if (!in_array($user['role'], ['admin', 'moderator'], true)) {
        errorResponse('Доступ запрещён', 403);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Аккаунт недоступен', 403);
    }

    $_SESSION['user_id'] = (int) $user['id'];

    unset($user['password_hash']);

    successResponse([
        'message' => 'Вход выполнен',
        'user' => $user,
    ]);
} catch (Throwable $error) {
    errorResponse('Ошибка входа', 500);
}