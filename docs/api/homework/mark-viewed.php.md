<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/homework.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'student') {
    errorResponse('Отметить просмотр может только ученик', 403);
}

$data = getJsonInput();
$homeworkId = homeworkParsePositiveId($data['homework_id'] ?? null, 'задание');

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("
        UPDATE homework
        SET viewed_at = COALESCE(viewed_at, CURRENT_TIMESTAMP)
        WHERE id = :homework_id
          AND student_id = :student_id
          AND status <> 'cancelled'
    ");
    $stmt->execute([
        'homework_id' => $homeworkId,
        'student_id' => (int) $user['id'],
    ]);

    if ($stmt->rowCount() === 0) {
        $check = $pdo->prepare("
            SELECT viewed_at
            FROM homework
            WHERE id = :homework_id AND student_id = :student_id
            LIMIT 1
        ");
        $check->execute([
            'homework_id' => $homeworkId,
            'student_id' => (int) $user['id'],
        ]);

        if ($check->fetchColumn() === false) {
            errorResponse('Домашнее задание не найдено', 404);
        }
    }

    notificationMarkEntityRead($pdo, (int) $user['id'], 'homework', $homeworkId);

    successResponse(['message' => 'Просмотр отмечен']);
} catch (Throwable $error) {
    error_log('homework/mark-viewed.php: ' . $error->getMessage());
    errorResponse('Не удалось отметить просмотр', 500);
}