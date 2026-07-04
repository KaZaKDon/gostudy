# api/admin/users/update-role.php

Назначение: изменение роли пользователя.

Статус: ✅ Реализован.

<?php

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();

$pdo = $auth['pdo'];
$admin = $auth['user'];

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        adminJsonResponse([
            'success' => false,
            'message' => 'Метод не поддерживается',
        ], 405);
    }

    if (($admin['role'] ?? '') !== 'admin') {
        adminJsonResponse([
            'success' => false,
            'message' => 'Недостаточно прав',
        ], 403);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Некорректный JSON',
        ], 400);
    }

    $userId = (int) ($input['user_id'] ?? $input['id'] ?? 0);
    $role = trim($input['role'] ?? '');

    $allowedRoles = ['student', 'teacher', 'admin', 'moderator'];

    if ($userId <= 0) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не передан ID пользователя',
        ], 400);
    }

    if (!in_array($role, $allowedRoles, true)) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Недопустимая роль пользователя',
        ], 400);
    }

    if ($userId === (int) $admin['id']) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Нельзя изменить роль собственного аккаунта',
        ], 400);
    }

    $stmt = $pdo->prepare("
        SELECT id, role
        FROM users
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $userId,
    ]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Пользователь не найден',
        ], 404);
    }

    if ($user['role'] === $role) {
        adminJsonResponse([
            'success' => true,
            'message' => 'Роль пользователя не изменилась',
        ]);
    }

    $updateStmt = $pdo->prepare("
        UPDATE users
        SET
            role = :role,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'role' => $role,
        'id' => $userId,
    ]);

    adminJsonResponse([
        'success' => true,
        'message' => 'Роль пользователя обновлена',
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка обновления роли пользователя',
        'error' => $error->getMessage(),
    ], 500);
}