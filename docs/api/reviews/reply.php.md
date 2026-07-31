<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/reviews.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Ответить на отзыв может только преподаватель', 403);
}

$data = getJsonInput();

try {
    $reviewId = reviewParsePositiveId(
        $data['review_id'] ?? null,
        'отзыв'
    );
} catch (InvalidArgumentException $error) {
    errorResponse($error->getMessage());
}

$text = trim((string) ($data['text'] ?? ''));

if (mb_strlen($text) < 2) {
    errorResponse('Напишите ответ на отзыв');
}

if (mb_strlen($text) > 2000) {
    errorResponse('Ответ не должен превышать 2000 символов');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $reviewStmt = $pdo->prepare("
        SELECT id
        FROM reviews
        WHERE id = :review_id
          AND teacher_id = :teacher_id
          AND published_at IS NOT NULL
        LIMIT 1
        FOR UPDATE
    ");
    $reviewStmt->execute([
        'review_id' => $reviewId,
        'teacher_id' => (int) $user['id'],
    ]);

    if (!$reviewStmt->fetchColumn()) {
        errorResponse('Опубликованный отзыв не найден', 404);
    }

    $saveStmt = $pdo->prepare("
        UPDATE reviews
        SET
            pending_teacher_reply = :reply,
            reply_status = 'pending',
            reply_rejection_reason = NULL,
            reply_moderated_by = NULL,
            reply_moderated_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :review_id
    ");
    $saveStmt->execute([
        'reply' => $text,
        'review_id' => $reviewId,
    ]);

    $pdo->commit();

    successResponse([
        'message' => 'Ответ отправлен на модерацию',
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('reviews/reply.php: ' . $error->getMessage());
    errorResponse('Не удалось сохранить ответ', 500);
}
