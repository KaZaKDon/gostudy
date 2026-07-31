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
    errorResponse('Ответить может только участник урока', 403);
}

$data = getJsonInput();

$requestId = filter_var(
    $data['request_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);
$decision = trim((string) ($data['decision'] ?? ''));
$comment = trim((string) ($data['comment'] ?? ''));

if ($requestId === false) {
    errorResponse('Предложение не выбрано');
}

if (!in_array($decision, ['approve', 'reject'], true)) {
    errorResponse('Некорректный ответ на предложение');
}

if ($decision === 'reject' && $comment === '') {
    errorResponse('Объясните причину отказа');
}

if (mb_strlen($comment) > 2000) {
    errorResponse('Комментарий не должен превышать 2000 символов');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            lcr.*,
            l.teacher_id,
            l.student_id,
            l.lesson_date,
            l.duration_minutes,
            l.status AS lesson_status,
            l.title AS lesson_title
        FROM lesson_change_requests lcr
        INNER JOIN lessons l
            ON l.id = lcr.lesson_id
        WHERE lcr.id = :request_id
          AND (
              l.teacher_id = :teacher_user_id
              OR l.student_id = :student_user_id
          )
        LIMIT 1
        FOR UPDATE
    ");

    $stmt->execute([
        'request_id' => $requestId,
        'teacher_user_id' => $user['id'],
        'student_user_id' => $user['id'],
    ]);

    $request = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$request) {
        errorResponse('Предложение не найдено', 404);
    }

    if ((int) $request['requested_by'] === (int) $user['id']) {
        errorResponse('Нельзя отвечать на собственное предложение', 403);
    }

    if ($request['status'] !== 'pending') {
        errorResponse('На это предложение уже дан ответ', 409);
    }

    if (!in_array(
        $request['lesson_status'],
        ['scheduled', 'rescheduled'],
        true
    )) {
        errorResponse('Состояние урока уже изменилось', 409);
    }

    if ($decision === 'approve') {
        if ($request['request_type'] === 'reschedule') {
            $proposedStorageDate = $request['proposed_lesson_date'];
            $proposedDate = DateTimeImmutable::createFromFormat(
                '!Y-m-d H:i:s',
                (string) $proposedStorageDate,
                lessonPlatformTimezone()
            );

            if (
                !$proposedDate
                || $proposedDate <= new DateTimeImmutable(
                    'now',
                    lessonPlatformTimezone()
                )
            ) {
                errorResponse('Предложенное время уже недоступно', 409);
            }

            $storageEnd = lessonToStorageDateTime(
                $proposedDate->modify(
                    '+' . (int) $request['duration_minutes'] . ' minutes'
                )
            );

            $conflict = lessonFindScheduleConflict(
                $pdo,
                (int) $request['teacher_id'],
                (int) $request['student_id'],
                $proposedStorageDate,
                $storageEnd,
                (int) $request['lesson_id']
            );

            if ($conflict) {
                errorResponse(
                    lessonConflictMessage(
                        $conflict,
                        (int) $request['teacher_id']
                    ),
                    409
                );
            }

            $lessonUpdateStmt = $pdo->prepare("
                UPDATE lessons
                SET lesson_date = :lesson_date,
                    status = 'rescheduled'
                WHERE id = :lesson_id
            ");

            $lessonUpdateStmt->execute([
                'lesson_date' => $proposedStorageDate,
                'lesson_id' => $request['lesson_id'],
            ]);
        } else {
            $lessonUpdateStmt = $pdo->prepare("
                UPDATE lessons
                SET status = 'cancelled'
                WHERE id = :lesson_id
            ");

            $lessonUpdateStmt->execute([
                'lesson_id' => $request['lesson_id'],
            ]);
        }
    }

    $requestStatus = $decision === 'approve'
        ? 'approved'
        : 'rejected';

    $responseStmt = $pdo->prepare("
        UPDATE lesson_change_requests
        SET status = :status,
            response_comment = :response_comment,
            responded_by = :responded_by,
            responded_at = NOW()
        WHERE id = :request_id
          AND status = 'pending'
    ");

    $responseStmt->execute([
        'status' => $requestStatus,
        'response_comment' => $comment !== '' ? $comment : null,
        'responded_by' => $user['id'],
        'request_id' => $requestId,
    ]);

    $isReschedule = $request['request_type'] === 'reschedule';
    $actionName = $isReschedule ? 'перенос' : 'отмену';
    $targetStorageDate = $decision === 'approve' && $isReschedule
        ? $request['proposed_lesson_date']
        : $request['lesson_date'];

    notificationCreate(
        $pdo,
        (int) $request['requested_by'],
        $decision === 'approve'
            ? 'lesson_change_approved'
            : 'lesson_change_rejected',
        $decision === 'approve'
            ? 'Предложение принято'
            : 'Предложение отклонено',
        $user['full_name']
            . ($decision === 'approve' ? ' принял(а) ' : ' отклонил(а) ')
            . $actionName . ' урока «' . $request['lesson_title'] . '».',
        NOTIFICATION_SECTION_SCHEDULE,
        'lesson_change',
        (int) $request['id'],
        notificationLessonTargetDateForUser(
            $pdo,
            (int) $request['requested_by'],
            $request['requested_role'],
            $targetStorageDate
        )
    );

    $pdo->commit();

    successResponse([
        'message' => $decision === 'approve'
            ? 'Предложение принято'
            : 'Предложение отклонено',
        'lesson_id' => (int) $request['lesson_id'],
        'request_status' => $requestStatus,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('lessons/respond-change.php: ' . $error->getMessage());
    errorResponse('Не удалось обработать предложение', 500);
}
