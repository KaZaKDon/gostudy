<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'], true)) {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
$currentTokenHash = hash('sha256', getBearerToken());

function accountActiveSessionCount(PDO $pdo, int $userId): int
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM auth_tokens
        WHERE user_id = :user_id
          AND expires_at > CURRENT_TIMESTAMP
    ");
    $stmt->execute(['user_id' => $userId]);

    return (int) $stmt->fetchColumn();
}

try {
    $pdo = getDatabaseConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        successResponse([
            'active_sessions' => accountActiveSessionCount(
                $pdo,
                (int) $user['id']
            ),
        ]);
    }

    $data = getJsonInput();
    $action = trim((string) ($data['action'] ?? ''));

    if ($action === 'logout_other_sessions') {
        $stmt = $pdo->prepare("
            DELETE FROM auth_tokens
            WHERE user_id = :user_id
              AND token_hash <> :current_token_hash
        ");
        $stmt->execute([
            'user_id' => $user['id'],
            'current_token_hash' => $currentTokenHash,
        ]);

        successResponse([
            'message' => 'Остальные сеансы завершены',
            'active_sessions' => 1,
        ]);
    }

    if ($action !== 'change_password') {
        errorResponse('Неизвестное действие');
    }

    $currentPassword = (string) ($data['current_password'] ?? '');
    $newPassword = (string) ($data['new_password'] ?? '');
    $confirmation = (string) ($data['new_password_confirmation'] ?? '');

    if ($currentPassword === '') {
        errorResponse('Введите текущий пароль');
    }

    if (mb_strlen($newPassword) < 8) {
        errorResponse('Новый пароль должен содержать не менее 8 символов');
    }

    if (strlen($newPassword) > 72) {
        errorResponse('Новый пароль не должен превышать 72 байта');
    }

    if ($newPassword !== $confirmation) {
        errorResponse('Новый пароль и подтверждение не совпадают');
    }

    $passwordStmt = $pdo->prepare("
        SELECT password_hash
        FROM users
        WHERE id = :user_id
        LIMIT 1
    ");
    $passwordStmt->execute(['user_id' => $user['id']]);
    $passwordHash = $passwordStmt->fetchColumn();

    if (
        !is_string($passwordHash)
        || !password_verify($currentPassword, $passwordHash)
    ) {
        errorResponse('Текущий пароль указан неверно', 403);
    }

    if (password_verify($newPassword, $passwordHash)) {
        errorResponse('Новый пароль должен отличаться от текущего');
    }

    $pdo->beginTransaction();

    $updateStmt = $pdo->prepare("
        UPDATE users
        SET password_hash = :password_hash,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :user_id
    ");
    $updateStmt->execute([
        'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
        'user_id' => $user['id'],
    ]);

    $sessionsStmt = $pdo->prepare("
        DELETE FROM auth_tokens
        WHERE user_id = :user_id
          AND token_hash <> :current_token_hash
    ");
    $sessionsStmt->execute([
        'user_id' => $user['id'],
        'current_token_hash' => $currentTokenHash,
    ]);

    $pdo->commit();

    successResponse([
        'message' => 'Пароль изменён. Остальные сеансы завершены',
        'active_sessions' => 1,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('auth/security.php: ' . $error->getMessage());
    errorResponse('Не удалось изменить настройки безопасности', 500);
}
