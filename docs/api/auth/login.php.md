<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
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
            phone,
            avatar_url,
            status,
            email_verified_at,
            profile_completed,
            email_verification_expires_at
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

    if ($user['status'] === 'blocked') {
        errorResponse('Аккаунт заблокирован. Обратитесь в поддержку.', 403);
    }

    if ($user['status'] === 'archived' || $user['status'] === 'deleted') {
        errorResponse('Аккаунт архивирован. Обратитесь в поддержку.', 403);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Аккаунт недоступен', 403);
    }

    if ($user['email_verified_at'] === null) {
        $isVerificationExpired =
            $user['email_verification_expires_at'] === null
            || strtotime($user['email_verification_expires_at']) < time();

        jsonResponse([
            'success' => false,
            'message' => $isVerificationExpired
                ? 'Срок действия письма подтверждения истёк.'
                : 'Подтвердите электронную почту.',
            'status' => 'email_not_verified',
            'email' => $user['email'],
            'verification_expired' => $isVerificationExpired,
        ], 403);
    }

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);

    $tokenStmt = $pdo->prepare("
        INSERT INTO auth_tokens (
            user_id,
            token_hash,
            expires_at
        ) VALUES (
            :user_id,
            :token_hash,
            DATE_ADD(NOW(), INTERVAL 30 DAY)
        )
    ");

    $tokenStmt->execute([
        'user_id' => (int) $user['id'],
        'token_hash' => $tokenHash,
    ]);

    $loginStmt = $pdo->prepare("
        UPDATE users
        SET last_login_at = NOW()
        WHERE id = :id
    ");

    $loginStmt->execute([
        'id' => (int) $user['id'],
    ]);

    successResponse([
        'message' => 'Вход выполнен',
        'token' => $token,
        'user' => [
            'id' => (int) $user['id'],
            'role' => $user['role'],
            'email' => $user['email'],
            'full_name' => $user['full_name'],
            'phone' => $user['phone'],
            'avatar_url' => $user['avatar_url'],
            'status' => $user['status'],
            'email_verified' => true,
            'profile_completed' => (bool) $user['profile_completed'],
        ],
    ]);
} catch (Throwable $error) {
    errorResponse('Ошибка входа', 500);
}