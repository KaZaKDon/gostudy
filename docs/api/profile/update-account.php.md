<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
$data = getJsonInput();
$phone = trim((string) ($data['phone'] ?? ''));

if (mb_strlen($phone) > 50) {
    errorResponse('Телефон не должен превышать 50 символов');
}

if (
    $phone !== ''
    && !preg_match('/^[0-9+\s().-]{7,50}$/u', $phone)
) {
    errorResponse('Укажите корректный номер телефона');
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        UPDATE users
        SET phone = :phone,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :user_id
    ");
    $stmt->execute([
        'phone' => $phone !== '' ? $phone : null,
        'user_id' => $user['id'],
    ]);

    $user['phone'] = $phone !== '' ? $phone : null;

    successResponse([
        'message' => 'Контактные данные сохранены',
        'user' => $user,
    ]);
} catch (Throwable $error) {
    error_log('profile/update-account.php: ' . $error->getMessage());
    errorResponse('Не удалось сохранить контактные данные', 500);
}
