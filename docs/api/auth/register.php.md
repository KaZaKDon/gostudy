<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../mail/MailService.php';

use GoStudy\Mail\MailService;

$authConfig = require __DIR__ . '/../config/auth.php';
$appConfig = require __DIR__ . '/../config/app.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$data = getJsonInput();

$role = trim($data['role'] ?? '');
$email = mb_strtolower(trim($data['email'] ?? ''));
$password = (string) ($data['password'] ?? '');

if (!in_array($role, ['student', 'teacher'], true)) {
    errorResponse('Некорректная роль пользователя');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Некорректный email');
}

if (mb_strlen($password) < 6) {
    errorResponse('Пароль должен быть не короче 6 символов');
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);

    if ($stmt->fetch()) {
        errorResponse('Пользователь с таким email уже существует', 409);
    }

    $pdo->beginTransaction();

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $verificationToken = bin2hex(random_bytes(32));
    $verificationExpiresAt = date(
        'Y-m-d H:i:s',
        time() + $authConfig['verification_lifetime']
    );
    $verificationSentAt = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        INSERT INTO users (
            role,
            email,
            password_hash,
            full_name,
            phone,
            status,
            email_verified_at,
            profile_completed,
            email_verification_token,
            email_verification_expires_at,
            email_verification_sent_at
        )
        VALUES (
            :role,
            :email,
            :password_hash,
            NULL,
            NULL,
            'active',
            NULL,
            0,
            :email_verification_token,
            :email_verification_expires_at,
            :email_verification_sent_at
        )
    ");

    $stmt->execute([
        'role' => $role,
        'email' => $email,
        'password_hash' => $passwordHash,
        'email_verification_token' => $verificationToken,
        'email_verification_expires_at' => $verificationExpiresAt,
        'email_verification_sent_at' => $verificationSentAt,
    ]);

    $userId = (int) $pdo->lastInsertId();

    if ($role === 'student') {
        $stmt = $pdo->prepare("
            INSERT INTO student_profiles (user_id)
            VALUES (:user_id)
        ");
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO teacher_profiles (user_id)
            VALUES (:user_id)
        ");
    }

    $stmt->execute(['user_id' => $userId]);

    $pdo->commit();

    $verificationUrl =
        $appConfig['url']
        . '/verify-email?token='
        . urlencode($verificationToken);

    $mailService = new MailService();

    $mailSent = $mailService->sendVerificationEmail(
        $email,
        'пользователь GoStudy',
        $verificationUrl
    );

    successResponse([
        'message' => $mailSent
            ? 'Регистрация выполнена. Мы отправили письмо для подтверждения email.'
            : 'Регистрация выполнена, но письмо подтверждения не удалось отправить.',
        'email_verification_required' => true,
        'mail_sent' => $mailSent,
        'user' => [
            'id' => $userId,
            'role' => $role,
            'email' => $email,
            'status' => 'active',
            'email_verified_at' => null,
            'profile_completed' => false,
        ],
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Ошибка регистрации', 500);
}