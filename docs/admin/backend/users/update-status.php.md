# api/admin/users/update-status.php

Назначение: блокировка, архивирование и восстановление.

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

    $userId = (int) ($input['id'] ?? 0);
    $status = trim($input['status'] ?? '');
    $blockedReason = trim($input['blocked_reason'] ?? '');
    $archiveReason = trim($input['archive_reason'] ?? '');

    $allowedStatuses = ['active', 'blocked', 'deleted'];

    if ($userId <= 0) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не передан ID пользователя',
        ], 400);
    }

    if (!in_array($status, $allowedStatuses, true)) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Некорректный статус',
        ], 400);
    }

    if ($userId === (int) $admin['id'] && $status !== 'active') {
        adminJsonResponse([
            'success' => false,
            'message' => 'Нельзя заблокировать или архивировать собственный аккаунт',
        ], 400);
    }

    if ($status === 'deleted' && $archiveReason === '') {
        $archiveReason = 'Архивирован администратором';
    }

    $stmt = $pdo->prepare("
        SELECT id, role, status
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

    $updateStmt = $pdo->prepare("
        UPDATE users
        SET
            status = :status,
            blocked_reason = :blocked_reason,
            archived_at = :archived_at,
            archived_by = :archived_by,
            archive_reason = :archive_reason,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'status' => $status,
        'blocked_reason' => $status === 'blocked' ? $blockedReason : null,
        'archived_at' => $status === 'deleted' ? date('Y-m-d H:i:s') : null,
        'archived_by' => $status === 'deleted' ? (int) $admin['id'] : null,
        'archive_reason' => $status === 'deleted' ? $archiveReason : null,
        'id' => $userId,
    ]);

    adminJsonResponse([
        'success' => true,
        'message' => 'Статус пользователя обновлён',
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка изменения статуса пользователя',
        'error' => $error->getMessage(),
    ], 500);
}