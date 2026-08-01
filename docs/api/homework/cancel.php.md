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

if ($user['role'] !== 'teacher') {
    errorResponse('Отменить задание может только преподаватель', 403);
}

$data = getJsonInput();
$homeworkId = homeworkParsePositiveId($data['homework_id'] ?? null, 'задание');

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $homework = homeworkFindForUser($pdo, $homeworkId, $user, true);

    if (!$homework) {
        errorResponse('Домашнее задание не найдено', 404);
    }

    if ($homework['status'] !== HOMEWORK_STATUS_ACTIVE) {
        errorResponse('Задание уже закрыто');
    }

    if ($homework['attempt_number'] !== null) {
        errorResponse('Задание с отправленными попытками нельзя отменить', 409);
    }

    $stmt = $pdo->prepare("
        UPDATE homework
        SET status = 'cancelled',
            cancelled_at = CURRENT_TIMESTAMP
        WHERE id = :homework_id
    ");
    $stmt->execute(['homework_id' => $homeworkId]);

    notificationCreate(
        $pdo,
        (int) $homework['student_id'],
        'homework_cancelled',
        'Домашнее задание отменено',
        $homework['subject_name'] . ': ' . $homework['title'],
        NOTIFICATION_SECTION_HOMEWORK,
        'homework',
        $homeworkId
    );

    $cancelEmails = $pdo->prepare("
        UPDATE homework_email_deliveries
        SET status = 'cancelled'
        WHERE homework_id = :homework_id
          AND status IN ('pending', 'failed')
    ");
    $cancelEmails->execute(['homework_id' => $homeworkId]);
    $pdo->commit();

    successResponse(['message' => 'Домашнее задание отменено']);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('homework/cancel.php: ' . $error->getMessage());
    errorResponse('Не удалось отменить домашнее задание', 500);
}