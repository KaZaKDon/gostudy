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

if ($user['role'] !== 'student') {
    errorResponse('Оставить отзыв может только ученик', 403);
}

$data = getJsonInput();

try {
    $relationId = reviewParsePositiveId(
        $data['relation_id'] ?? null,
        'преподаватель'
    );
} catch (InvalidArgumentException $error) {
    errorResponse($error->getMessage());
}

$rating = filter_var(
    $data['rating'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1, 'max_range' => 5]]
);
$text = trim((string) ($data['text'] ?? ''));

if ($rating === false) {
    errorResponse('Выберите оценку от 1 до 5');
}

if (mb_strlen($text) < 20) {
    errorResponse('Напишите отзыв длиной не менее 20 символов');
}

if (mb_strlen($text) > 3000) {
    errorResponse('Отзыв не должен превышать 3000 символов');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $relation = reviewFindRelation(
        $pdo,
        $relationId,
        (int) $user['id'],
        true
    );

    if (!$relation) {
        errorResponse('Связь с преподавателем не найдена', 404);
    }

    if ((int) $relation['completed_lessons_count'] <= 0) {
        errorResponse(
            'Отзыв можно оставить после первого проведённого урока',
            409
        );
    }

    $existingStmt = $pdo->prepare("
        SELECT id
        FROM reviews
        WHERE teacher_student_id = :relation_id
        LIMIT 1
        FOR UPDATE
    ");
    $existingStmt->execute([
        'relation_id' => $relationId,
    ]);
    $reviewId = (int) $existingStmt->fetchColumn();

    if ($reviewId > 0) {
        $saveStmt = $pdo->prepare("
            UPDATE reviews
            SET
                rating = :rating,
                text = :text,
                status = 'pending',
                rejection_reason = NULL,
                moderated_by = NULL,
                moderated_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :review_id
        ");
        $saveStmt->execute([
            'rating' => (int) $rating,
            'text' => $text,
            'review_id' => $reviewId,
        ]);
    } else {
        $saveStmt = $pdo->prepare("
            INSERT INTO reviews (
                student_id,
                teacher_id,
                teacher_student_id,
                subject_id,
                rating,
                text,
                status
            ) VALUES (
                :student_id,
                :teacher_id,
                :teacher_student_id,
                :subject_id,
                :rating,
                :text,
                'pending'
            )
        ");
        $saveStmt->execute([
            'student_id' => (int) $user['id'],
            'teacher_id' => (int) $relation['teacher_id'],
            'teacher_student_id' => $relationId,
            'subject_id' => (int) $relation['subject_id'],
            'rating' => (int) $rating,
            'text' => $text,
        ]);
        $reviewId = (int) $pdo->lastInsertId();
    }

    $pdo->commit();

    successResponse([
        'message' => 'Отзыв отправлен на модерацию',
        'review_id' => $reviewId,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('reviews/save.php: ' . $error->getMessage());
    errorResponse('Не удалось сохранить отзыв', 500);
}
