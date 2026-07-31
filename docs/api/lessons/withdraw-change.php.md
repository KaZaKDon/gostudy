<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/notifications.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
$data = getJsonInput();

$requestId = filter_var(
    $data['request_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);

if ($requestId === false) {
    errorResponse('Предложение не выбрано');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            lcr.id,
            lcr.request_type,
            l.teacher_id,
            l.student_id,
            l.lesson_date,
            l.title AS lesson_title
        FROM lesson_change_requests lcr
        INNER JOIN lessons l
            ON l.id = lcr.lesson_id
        WHERE lcr.id = :request_id
          AND lcr.requested_by = :requested_by
          AND lcr.status = 'pending'
          AND (
              l.teacher_id = :teacher_user_id
              OR l.student_id = :student_user_id
          )
        LIMIT 1
        FOR UPDATE
    ");

    $stmt->execute([
        'request_id' => $requestId,
        'requested_by' => $user['id'],
        'teacher_user_id' => $user['id'],
        'student_user_id' => $user['id'],
    ]);

    $request = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$request) {
        errorResponse('Ожидающее предложение не найдено', 404);
    }

    $updateStmt = $pdo->prepare("
        UPDATE lesson_change_requests
        SET status = 'withdrawn'
        WHERE id = :request_id
          AND status = 'pending'
    ");

    $updateStmt->execute([
        'request_id' => $requestId,
    ]);

    $recipientId = notificationLessonRecipient(
        $request,
        (int) $user['id']
    );
    $recipientRole = $user['role'] === 'teacher'
        ? 'student'
        : 'teacher';

    notificationCreate(
        $pdo,
        $recipientId,
        'lesson_change_withdrawn',
        'Предложение отозвано',
        $user['full_name'] . ' отозвал(а) предложение '
            . ($request['request_type'] === 'reschedule'
                ? 'переноса'
                : 'отмены')
            . ' урока «' . $request['lesson_title'] . '».',
        NOTIFICATION_SECTION_SCHEDULE,
        'lesson_change',
        (int) $request['id'],
        notificationLessonTargetDateForUser(
            $pdo,
            $recipientId,
            $recipientRole,
            $request['lesson_date']
        )
    );

    $pdo->commit();

    successResponse([
        'message' => 'Предложение отозвано',
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('lessons/withdraw-change.php: ' . $error->getMessage());
    errorResponse('Не удалось отозвать предложение', 500);
}
