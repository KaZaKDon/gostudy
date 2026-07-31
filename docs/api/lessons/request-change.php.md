<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/lesson-time.php';
require_once __DIR__ . '/../shared/lesson-management.php';
require_once __DIR__ . '/../shared/notifications.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if (!in_array($user['role'], ['student', 'teacher'], true)) {
    errorResponse('Изменять урок может только его участник', 403);
}

$data = getJsonInput();

$lessonId = filter_var(
    $data['lesson_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);
$requestType = trim((string) ($data['request_type'] ?? ''));
$proposedDateInput = trim((string) ($data['proposed_lesson_date'] ?? ''));
$comment = trim((string) ($data['comment'] ?? ''));

if ($lessonId === false) {
    errorResponse('Урок не выбран');
}

if (!in_array($requestType, ['reschedule', 'cancel'], true)) {
    errorResponse('Некорректный тип изменения');
}

if ($comment === '') {
    errorResponse('Объясните причину предложения');
}

if (mb_strlen($comment) > 2000) {
    errorResponse('Комментарий не должен превышать 2000 символов');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $lesson = lessonLoadParticipantForUpdate(
        $pdo,
        (int) $lessonId,
        $user
    );

    if (!$lesson) {
        errorResponse('Урок не найден', 404);
    }

    if (!lessonCanBeChanged($lesson)) {
        errorResponse('Этот урок уже нельзя перенести или отменить', 409);
    }

    $pendingStmt = $pdo->prepare("
        SELECT id
        FROM lesson_change_requests
        WHERE lesson_id = :lesson_id
          AND status = 'pending'
        LIMIT 1
        FOR UPDATE
    ");

    $pendingStmt->execute([
        'lesson_id' => $lessonId,
    ]);

    if ($pendingStmt->fetchColumn()) {
        errorResponse('По этому уроку уже ожидается ответ на предложение', 409);
    }

    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);
    $storageProposedDate = null;

    if ($requestType === 'reschedule') {
        $proposedDate = lessonParseLocalDateTime(
            $proposedDateInput,
            $viewerTimezone
        );

        if (!$proposedDate) {
            errorResponse('Укажите корректные дату и время переноса');
        }

        $now = new DateTimeImmutable('now', $viewerTimezone);

        if ($proposedDate <= $now) {
            errorResponse('Перенести урок можно только на будущее время');
        }

        if ($proposedDate > $now->modify('+1 year')) {
            errorResponse('Урок нельзя перенести более чем на год вперёд');
        }

        $storageProposedDate = lessonToStorageDateTime($proposedDate);

        if ($storageProposedDate === $lesson['lesson_date']) {
            errorResponse('Новое время совпадает с текущим');
        }

        $storageEnd = lessonToStorageDateTime(
            $proposedDate->modify(
                '+' . (int) $lesson['duration_minutes'] . ' minutes'
            )
        );

        $conflict = lessonFindScheduleConflict(
            $pdo,
            (int) $lesson['teacher_id'],
            (int) $lesson['student_id'],
            $storageProposedDate,
            $storageEnd,
            (int) $lesson['id']
        );

        if ($conflict) {
            errorResponse(
                lessonConflictMessage(
                    $conflict,
                    (int) $lesson['teacher_id']
                ),
                409
            );
        }
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO lesson_change_requests (
            lesson_id,
            requested_by,
            requested_role,
            request_type,
            original_lesson_date,
            proposed_lesson_date,
            request_comment
        ) VALUES (
            :lesson_id,
            :requested_by,
            :requested_role,
            :request_type,
            :original_lesson_date,
            :proposed_lesson_date,
            :request_comment
        )
    ");

    $insertStmt->execute([
        'lesson_id' => $lessonId,
        'requested_by' => $user['id'],
        'requested_role' => $user['role'],
        'request_type' => $requestType,
        'original_lesson_date' => $lesson['lesson_date'],
        'proposed_lesson_date' => $storageProposedDate,
        'request_comment' => $comment,
    ]);

    $requestId = (int) $pdo->lastInsertId();

    $recipientId = notificationLessonRecipient(
        $lesson,
        (int) $user['id']
    );
    $recipientRole = $user['role'] === 'teacher'
        ? 'student'
        : 'teacher';
    $targetStorageDate = $requestType === 'reschedule'
        ? $storageProposedDate
        : $lesson['lesson_date'];

    notificationCreate(
        $pdo,
        $recipientId,
        $requestType === 'reschedule'
            ? 'lesson_reschedule_requested'
            : 'lesson_cancel_requested',
        $requestType === 'reschedule'
            ? 'Предложен перенос урока'
            : 'Предложена отмена урока',
        $user['full_name']
            . ($requestType === 'reschedule'
                ? ' предлагает перенести урок «'
                : ' предлагает отменить урок «')
            . ($lesson['subject_name'] ?: $lesson['title']) . '».',
        NOTIFICATION_SECTION_SCHEDULE,
        'lesson_change',
        $requestId,
        notificationLessonTargetDateForUser(
            $pdo,
            $recipientId,
            $recipientRole,
            $targetStorageDate
        )
    );

    $pdo->commit();

    successResponse([
        'message' => $requestType === 'reschedule'
            ? 'Предложение переноса отправлено'
            : 'Предложение отмены отправлено',
        'change_request' => [
            'id' => $requestId,
            'lesson_id' => (int) $lessonId,
            'requested_by' => (int) $user['id'],
            'requested_role' => $user['role'],
            'requester_name' => $user['full_name'],
            'request_type' => $requestType,
            'status' => 'pending',
            'original_lesson_date' => lessonFromStorageDateTime(
                $lesson['lesson_date'],
                $viewerTimezone
            ),
            'proposed_lesson_date' => lessonFromStorageDateTime(
                $storageProposedDate,
                $viewerTimezone
            ),
            'request_comment' => $comment,
            'can_respond' => false,
            'can_withdraw' => true,
        ],
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('lessons/request-change.php: ' . $error->getMessage());
    errorResponse('Не удалось отправить предложение', 500);
}
