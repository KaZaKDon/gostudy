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

if ($user['role'] !== 'teacher') {
    errorResponse('Настройка доступна только преподавателю', 403);
}

$data = getJsonInput();
$rawVisibility = $data['is_visible'] ?? null;

if (
    !is_bool($rawVisibility)
    && $rawVisibility !== 0
    && $rawVisibility !== 1
    && $rawVisibility !== '0'
    && $rawVisibility !== '1'
) {
    errorResponse('Некорректное значение видимости');
}

$isVisible = filter_var($rawVisibility, FILTER_VALIDATE_BOOLEAN);

try {
    $pdo = getDatabaseConnection();

    $profileStmt = $pdo->prepare("
        SELECT verification_status, is_visible
        FROM teacher_profiles
        WHERE user_id = :user_id
        LIMIT 1
    ");
    $profileStmt->execute(['user_id' => $user['id']]);
    $profile = $profileStmt->fetch(PDO::FETCH_ASSOC);

    if (!$profile) {
        errorResponse('Сначала заполните анкету преподавателя', 404);
    }

    if ($isVisible && $profile['verification_status'] !== 'approved') {
        errorResponse(
            'Показ анкеты можно включить после подтверждения модератором',
            409
        );
    }

    $updateStmt = $pdo->prepare("
        UPDATE teacher_profiles
        SET is_visible = :is_visible,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = :user_id
    ");
    $updateStmt->execute([
        'is_visible' => (int) $isVisible,
        'user_id' => $user['id'],
    ]);

    successResponse([
        'message' => $isVisible
            ? 'Анкета показывается в поиске'
            : 'Анкета скрыта из поиска',
        'profile' => [
            'is_visible' => $isVisible,
            'verification_status' => $profile['verification_status'],
        ],
    ]);
} catch (Throwable $error) {
    error_log('profile/update-visibility.php: ' . $error->getMessage());
    errorResponse('Не удалось изменить видимость анкеты', 500);
}
