<?php

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();

$pdo = $auth['pdo'];
$user = $auth['user'];

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        adminJsonResponse([
            'success' => false,
            'message' => 'Метод не поддерживается',
        ], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Некорректный JSON',
        ], 400);
    }

    $teacherId = (int) ($input['id'] ?? 0);
    $status = trim($input['status'] ?? '');
    $comment = trim($input['comment'] ?? '');

    $allowedStatuses = [
        'pending',
        'approved',
        'rejected',
    ];

    if ($teacherId <= 0) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не указан преподаватель',
        ], 400);
    }

    if (!in_array($status, $allowedStatuses, true)) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Некорректный статус проверки',
        ], 400);
    }

    $stmt = $pdo->prepare("
        SELECT
            tp.id,
            tp.user_id
        FROM teacher_profiles tp
        WHERE tp.user_id = :teacher_id
        LIMIT 1
    ");

    $stmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$profile) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Профиль преподавателя ещё не создан',
        ], 404);
    }

    $update = $pdo->prepare("
        UPDATE teacher_profiles
        SET
            verification_status = :status,
            verification_comment = :comment,
            verified_by = :verified_by,
            verified_at = CASE
                WHEN :status = 'approved'
                THEN NOW()
                ELSE NULL
            END,
            is_verified = CASE
                WHEN :status = 'approved'
                THEN 1
                ELSE 0
            END,
            updated_at = NOW()
        WHERE user_id = :teacher_id
    ");

    $update->execute([
        'status' => $status,
        'comment' => $comment,
        'verified_by' => (int) $user['id'],
        'teacher_id' => $teacherId,
    ]);

    adminJsonResponse([
        'success' => true,
        'message' => match ($status) {
            'approved' => 'Профиль преподавателя подтвержден',
            'rejected' => 'Профиль отправлен на доработку',
            default => 'Статус проверки обновлен',
        },
    ]);
} catch (Throwable $e) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка обновления проверки',
        'error' => $e->getMessage(),
    ], 500);
}