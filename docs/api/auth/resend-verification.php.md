<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../mail/MailService.php';

use GoStudy\Mail\MailService;

$appConfig = require __DIR__ . '/../config/app.php';
$authConfig = require __DIR__ . '/../config/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$data = getJsonInput();

$email = mb_strtolower(trim($data['email'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Некорректный email');
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            email,
            full_name,
            email_verified_at,
            email_verification_sent_at
        FROM users
        WHERE email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Пользователь с таким email не найден', 404);
    }

    if ($user['email_verified_at'] !== null) {
        errorResponse('Электронная почта уже подтверждена', 409);
    }

    if ($user['email_verification_sent_at'] !== null) {
        $lastSentAt = strtotime($user['email_verification_sent_at']);
        $nextAllowedAt = $lastSentAt + (int) $authConfig['verification_resend_interval'];

        if ($nextAllowedAt > time()) {
            errorResponse('Повторную отправку можно выполнить через минуту', 429);
        }
    }

    $verificationToken = bin2hex(random_bytes(32));
    $verificationExpiresAt = date(
        'Y-m-d H:i:s',
        time() + (int) $authConfig['verification_lifetime']
    );
    $verificationSentAt = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        UPDATE users
        SET
            email_verification_token = :email_verification_token,
            email_verification_expires_at = :email_verification_expires_at,
            email_verification_sent_at = :email_verification_sent_at
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'email_verification_token' => $verificationToken,
        'email_verification_expires_at' => $verificationExpiresAt,
        'email_verification_sent_at' => $verificationSentAt,
        'id' => (int) $user['id'],
    ]);

    $verificationUrl =
        $appConfig['url']
        . '/verify-email?token='
        . urlencode($verificationToken);

    $mailService = new MailService();

    $mailSent = $mailService->sendVerificationEmail(
        $email,
        $user['full_name'] ?: 'пользователь GoStudy',
        $verificationUrl
    );

    if (!$mailSent) {
        errorResponse('Не удалось отправить письмо подтверждения', 500);
    }

    successResponse([
        'message' => 'Новое письмо подтверждения отправлено',
        'email_verification_required' => true,
        'mail_sent' => true,
    ]);
} catch (Throwable $error) {
    errorResponse('Ошибка повторной отправки письма', 500);
}