<?php

require_once __DIR__ . '/../shared/require-moderator.php';
require_once __DIR__ . '/../shared/admin-log.php';

$auth = requireAdminOrModerator();

$pdo = $auth['pdo'];
$admin = $auth['user'];

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        adminJsonResponse([
            'success' => false,
            'message' => 'Метод не разрешён. Используйте POST-запрос.',
        ], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Некорректный JSON',
        ], 400);
    }

    $teacherId = (int) ($input['teacher_id'] ?? 0);
    $comment = trim($input['comment'] ?? '');

    if ($teacherId <= 0) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не передан ID преподавателя',
        ], 400);
    }

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.role,
            u.status,
            tp.verification_status,
            tp.verification_comment
        FROM users u
        INNER JOIN teacher_profiles tp ON tp.user_id = u.id
        WHERE u.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $teacherId,
    ]);

    $teacher = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$teacher || $teacher['role'] !== 'teacher') {
        adminJsonResponse([
            'success' => false,
            'message' => 'Преподаватель не найден',
        ], 404);
    }

    $oldValue = [
        'verification_status' => $teacher['verification_status'],
        'verification_comment' => $teacher['verification_comment'],
    ];

    $newValue = [
        'verification_status' => 'verified',
        'verification_comment' => $comment !== '' ? $comment : null,
        'verified_by' => (int) $admin['id'],
    ];

    $updateStmt = $pdo->prepare("
        UPDATE teacher_profiles
        SET
            verification_status = 'verified',
            verification_comment = :verification_comment,
            verified_by = :verified_by,
            verified_at = NOW()
        WHERE user_id = :teacher_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'verification_comment' => $comment !== '' ? $comment : null,
        'verified_by' => (int) $admin['id'],
        'teacher_id' => $teacherId,
    ]);

    writeAdminLog(
        $pdo,
        (int) $admin['id'],
        'teacher_verified',
        'teacher',
        $teacherId,
        $oldValue,
        $newValue
    );

    adminJsonResponse([
        'success' => true,
        'message' => 'Преподаватель подтверждён',
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка подтверждения преподавателя',
        'error' => $error->getMessage(),
    ], 500);
}