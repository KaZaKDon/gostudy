<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$token = trim($_GET['token'] ?? '');

if ($token === '') {
    errorResponse('Токен подтверждения не передан');
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            email,
            email_verified_at,
            email_verification_expires_at
        FROM users
        WHERE email_verification_token = :token
        LIMIT 1
    ");

    $stmt->execute([
        'token' => $token,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Ссылка подтверждения недействительна', 404);
    }

    if ($user['email_verified_at'] !== null) {
        successResponse([
            'message' => 'Электронная почта уже подтверждена',
            'email_verified' => true,
        ]);
    }

    if (
        $user['email_verification_expires_at'] === null ||
        strtotime($user['email_verification_expires_at']) < time()
    ) {
        jsonResponse([
            'success' => false,
            'status' => 'expired',
            'message' => 'Срок действия ссылки подтверждения истёк',
            'email' => $user['email'],
        ], 410);
    }

    $stmt = $pdo->prepare("
        UPDATE users
        SET
            email_verified_at = NOW(),
            email_verification_token = NULL,
            email_verification_expires_at = NULL,
            email_verification_sent_at = NULL
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => (int) $user['id'],
    ]);

    successResponse([
        'message' => 'Электронная почта успешно подтверждена',
        'email_verified' => true,
    ]);
} catch (Throwable $error) {
    errorResponse('Ошибка подтверждения электронной почты', 500);
}