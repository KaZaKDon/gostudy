<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../config/database.php';

$user = requireAuth();

if ($user['role'] !== 'student') {
    errorResponse('Настройки доступны только ученику', 403);
}

try {
    $pdo = getDatabaseConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->prepare("
            SELECT parent_email, parent_notifications_enabled
            FROM student_profiles
            WHERE user_id = :user_id
            LIMIT 1
        ");
        $stmt->execute(['user_id' => (int) $user['id']]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$settings) {
            errorResponse('Профиль ученика не найден', 404);
        }

        successResponse([
            'settings' => [
                'parent_email' => $settings['parent_email'],
                'parent_notifications_enabled' => (bool) $settings['parent_notifications_enabled'],
            ],
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = getJsonInput();
        $enabled = filter_var(
            $data['parent_notifications_enabled'] ?? null,
            FILTER_VALIDATE_BOOL,
            FILTER_NULL_ON_FAILURE
        );

        if ($enabled === null) {
            errorResponse('Некорректное значение настройки');
        }

        $profileStmt = $pdo->prepare("
            SELECT parent_email
            FROM student_profiles
            WHERE user_id = :user_id
            LIMIT 1
        ");
        $profileStmt->execute(['user_id' => (int) $user['id']]);
        $parentEmail = $profileStmt->fetchColumn();

        if ($parentEmail === false) {
            errorResponse('Профиль ученика не найден', 404);
        }

        if ($enabled && filter_var($parentEmail, FILTER_VALIDATE_EMAIL) === false) {
            errorResponse('Сначала укажите корректный email родителя в анкете');
        }

        $updateStmt = $pdo->prepare("
            UPDATE student_profiles
            SET parent_notifications_enabled = :enabled
            WHERE user_id = :user_id
        ");
        $updateStmt->execute([
            'enabled' => $enabled ? 1 : 0,
            'user_id' => (int) $user['id'],
        ]);

        successResponse([
            'message' => 'Настройки уведомлений сохранены',
            'settings' => [
                'parent_email' => $parentEmail ?: null,
                'parent_notifications_enabled' => $enabled,
            ],
        ]);
    }

    errorResponse('Метод не поддерживается', 405);
} catch (Throwable $error) {
    error_log('student/notification-settings.php: ' . $error->getMessage());
    errorResponse('Не удалось сохранить настройки уведомлений', 500);
}