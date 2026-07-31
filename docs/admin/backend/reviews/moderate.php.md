<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/require-moderator.php';
require_once __DIR__ . '/../../shared/json.php';
require_once __DIR__ . '/../../shared/notifications.php';
require_once __DIR__ . '/../../shared/reviews.php';

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];
$moderator = $auth['user'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    adminErrorResponse('Метод не поддерживается', 405);
}

$data = getJsonInput();

try {
    $reviewId = reviewParsePositiveId(
        $data['review_id'] ?? null,
        'отзыв'
    );
} catch (InvalidArgumentException $error) {
    adminErrorResponse($error->getMessage());
}

$target = trim((string) ($data['target'] ?? ''));
$decision = trim((string) ($data['decision'] ?? ''));
$comment = trim((string) ($data['comment'] ?? ''));

if (!in_array($target, ['review', 'reply'], true)) {
    adminErrorResponse('Выберите, что нужно проверить');
}

if (!in_array($decision, ['approved', 'rejected'], true)) {
    adminErrorResponse('Выберите решение модератора');
}

if ($decision === 'rejected' && $comment === '') {
    adminErrorResponse('Укажите причину отклонения');
}

if (mb_strlen($comment) > 3000) {
    adminErrorResponse('Комментарий не должен превышать 3000 символов');
}

try {
    $pdo->beginTransaction();
    $reviewStmt = $pdo->prepare("
        SELECT
            r.*,
            students.full_name AS student_name,
            teachers.full_name AS teacher_name,
            subjects.name AS subject_name
        FROM reviews r
        INNER JOIN users students
            ON students.id = r.student_id
        INNER JOIN users teachers
            ON teachers.id = r.teacher_id
        LEFT JOIN subjects
            ON subjects.id = r.subject_id
        WHERE r.id = :review_id
        LIMIT 1
        FOR UPDATE
    ");
    $reviewStmt->execute([
        'review_id' => $reviewId,
    ]);
    $review = $reviewStmt->fetch(PDO::FETCH_ASSOC);

    if (!$review) {
        adminNotFoundResponse('Отзыв не найден');
    }

    $subjectName = $review['subject_name'] ?: 'занятия';

    if ($target === 'review') {
        if ($review['status'] !== REVIEW_STATUS_PENDING) {
            adminConflictResponse('Эта редакция отзыва уже проверена');
        }

        if ($decision === REVIEW_STATUS_APPROVED) {
            $updateStmt = $pdo->prepare("
                UPDATE reviews
                SET
                    status = 'approved',
                    published_rating = rating,
                    published_text = text,
                    rejection_reason = NULL,
                    moderated_by = :moderator_id,
                    moderated_at = CURRENT_TIMESTAMP,
                    published_at = COALESCE(
                        published_at,
                        CURRENT_TIMESTAMP
                    ),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :review_id
            ");
            $updateStmt->execute([
                'moderator_id' => (int) $moderator['id'],
                'review_id' => $reviewId,
            ]);

            notificationCreate(
                $pdo,
                (int) $review['teacher_id'],
                'review_published',
                'Опубликован отзыв ученика',
                $review['student_name'] . ' · ' . $subjectName,
                NOTIFICATION_SECTION_STUDENTS,
                'review',
                $reviewId
            );
            notificationCreate(
                $pdo,
                (int) $review['student_id'],
                'review_approved',
                'Ваш отзыв опубликован',
                $review['teacher_name'] . ' · ' . $subjectName,
                NOTIFICATION_SECTION_TEACHERS,
                'review',
                $reviewId
            );
        } else {
            $updateStmt = $pdo->prepare("
                UPDATE reviews
                SET
                    status = 'rejected',
                    rejection_reason = :comment,
                    moderated_by = :moderator_id,
                    moderated_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :review_id
            ");
            $updateStmt->execute([
                'comment' => $comment,
                'moderator_id' => (int) $moderator['id'],
                'review_id' => $reviewId,
            ]);

            notificationCreate(
                $pdo,
                (int) $review['student_id'],
                'review_rejected',
                'Отзыв нужно исправить',
                $comment,
                NOTIFICATION_SECTION_TEACHERS,
                'review',
                $reviewId
            );
        }

        reviewRecalculateTeacherSummary(
            $pdo,
            (int) $review['teacher_id']
        );
    } else {
        if ($review['reply_status'] !== REVIEW_REPLY_PENDING) {
            adminConflictResponse('Этот ответ уже проверен');
        }

        if ($decision === REVIEW_REPLY_APPROVED) {
            $updateStmt = $pdo->prepare("
                UPDATE reviews
                SET
                    teacher_reply = pending_teacher_reply,
                    pending_teacher_reply = NULL,
                    reply_status = 'approved',
                    reply_rejection_reason = NULL,
                    reply_moderated_by = :moderator_id,
                    reply_moderated_at = CURRENT_TIMESTAMP,
                    replied_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :review_id
            ");
            $updateStmt->execute([
                'moderator_id' => (int) $moderator['id'],
                'review_id' => $reviewId,
            ]);

            notificationCreate(
                $pdo,
                (int) $review['student_id'],
                'review_reply_published',
                'Преподаватель ответил на отзыв',
                $review['teacher_name'] . ' · ' . $subjectName,
                NOTIFICATION_SECTION_TEACHERS,
                'review',
                $reviewId
            );
            notificationCreate(
                $pdo,
                (int) $review['teacher_id'],
                'review_reply_approved',
                'Ваш ответ на отзыв опубликован',
                $review['student_name'] . ' · ' . $subjectName,
                NOTIFICATION_SECTION_STUDENTS,
                'review',
                $reviewId
            );
        } else {
            $updateStmt = $pdo->prepare("
                UPDATE reviews
                SET
                    reply_status = 'rejected',
                    reply_rejection_reason = :comment,
                    reply_moderated_by = :moderator_id,
                    reply_moderated_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :review_id
            ");
            $updateStmt->execute([
                'comment' => $comment,
                'moderator_id' => (int) $moderator['id'],
                'review_id' => $reviewId,
            ]);

            notificationCreate(
                $pdo,
                (int) $review['teacher_id'],
                'review_reply_rejected',
                'Ответ на отзыв нужно исправить',
                $comment,
                NOTIFICATION_SECTION_STUDENTS,
                'review',
                $reviewId
            );
        }
    }

    $pdo->commit();

    adminSuccessResponse(
        [],
        $decision === 'approved'
            ? 'Публикация одобрена'
            : 'Публикация отклонена'
    );
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('admin/reviews/moderate.php: ' . $error->getMessage());
    adminServerErrorResponse('Не удалось сохранить решение');
}
