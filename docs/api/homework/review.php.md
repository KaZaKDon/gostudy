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
    errorResponse('Проверять работу может только преподаватель', 403);
}

$data = getJsonInput();
$homeworkId = homeworkParsePositiveId($data['homework_id'] ?? null, 'задание');
$decision = trim((string) ($data['decision'] ?? ''));
$grade = trim((string) ($data['grade'] ?? ''));
$comment = trim((string) ($data['teacher_comment'] ?? ''));

if (!in_array($decision, ['returned', 'accepted'], true)) {
    errorResponse('Выберите результат проверки');
}

if ($decision === 'returned' && $comment === '') {
    errorResponse('Укажите, что нужно доработать');
}

if (mb_strlen($grade) > 20 || mb_strlen($comment) > 10000) {
    errorResponse('Оценка или комментарий превышают допустимую длину');
}

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

    if (($homework['submission_status'] ?? null) !== HOMEWORK_SUBMISSION_SUBMITTED) {
        errorResponse('Нет отправленной работы для проверки', 409);
    }

    $submissionStmt = $pdo->prepare("
        SELECT id
        FROM homework_submissions
        WHERE homework_id = :homework_id
          AND attempt_number = :attempt_number
          AND status = 'submitted'
        LIMIT 1
        FOR UPDATE
    ");
    $submissionStmt->execute([
        'homework_id' => $homeworkId,
        'attempt_number' => (int) $homework['attempt_number'],
    ]);
    $submissionId = (int) $submissionStmt->fetchColumn();

    if ($submissionId <= 0) {
        errorResponse('Отправленная работа не найдена', 409);
    }

    $updateSubmission = $pdo->prepare("
        UPDATE homework_submissions
        SET status = :status,
            grade = :grade,
            teacher_comment = :teacher_comment,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = :submission_id
    ");
    $updateSubmission->execute([
        'status' => $decision,
        'grade' => $grade !== '' ? $grade : null,
        'teacher_comment' => $comment !== '' ? $comment : null,
        'submission_id' => $submissionId,
    ]);

    if ($decision === HOMEWORK_SUBMISSION_ACCEPTED) {
        $completeStmt = $pdo->prepare("
            UPDATE homework
            SET status = 'completed',
                completed_at = CURRENT_TIMESTAMP
            WHERE id = :homework_id
        ");
        $completeStmt->execute(['homework_id' => $homeworkId]);
    }

    notificationCreate(
        $pdo,
        (int) $homework['student_id'],
        $decision === HOMEWORK_SUBMISSION_ACCEPTED
            ? 'homework_accepted'
            : 'homework_returned',
        $decision === HOMEWORK_SUBMISSION_ACCEPTED
            ? 'Домашняя работа принята'
            : 'Домашняя работа требует доработки',
        $homework['subject_name'] . ': ' . $homework['title'],
        NOTIFICATION_SECTION_HOMEWORK,
        'homework',
        $homeworkId
    );

    $recipientStmt = $pdo->prepare("
        SELECT
            students.email AS student_email,
            students.full_name AS student_name,
            sp.parent_name,
            sp.parent_email,
            sp.parent_notifications_enabled
        FROM users students
        LEFT JOIN student_profiles sp ON sp.user_id = students.id
        WHERE students.id = :student_id
        LIMIT 1
    ");
    $recipientStmt->execute(['student_id' => (int) $homework['student_id']]);
    $recipient = $recipientStmt->fetch(PDO::FETCH_ASSOC);
    $emailHomework = [
        'id' => $homeworkId,
        'student_name' => $homework['student_name'],
        'teacher_name' => $homework['teacher_name'],
        'subject_name' => $homework['subject_name'],
        'title' => $homework['title'],
        'due_date' => $homework['due_date'],
    ];
    $deliveryIds = [];

    if ($recipient) {
        foreach ([
            [
                'type' => 'student',
                'email' => $recipient['student_email'],
                'name' => $recipient['student_name'],
                'enabled' => true,
            ],
            [
                'type' => 'parent',
                'email' => $recipient['parent_email'],
                'name' => $recipient['parent_name'] ?: 'родитель',
                'enabled' => (bool) $recipient['parent_notifications_enabled'],
            ],
        ] as $target) {
            if (!$target['enabled'] || empty($target['email'])) {
                continue;
            }

            $deliveryId = homeworkQueueEmail(
                $pdo,
                $decision . ':' . $submissionId . ':' . $target['type'],
                $homeworkId,
                $submissionId,
                $target['type'],
                (string) $target['email'],
                $decision,
                homeworkEmailPayload(
                    $emailHomework,
                    $decision,
                    (string) $target['email'],
                    (string) $target['name'],
                    $comment !== '' ? $comment : null
                )
            );

            if ($deliveryId !== null) {
                $deliveryIds[] = $deliveryId;
            }
        }
    }

    $pdo->commit();

    try {
        homeworkProcessEmailQueue($pdo, $deliveryIds);
    } catch (Throwable $mailError) {
        error_log('homework/review mail: ' . $mailError->getMessage());
    }

    successResponse([
        'message' => $decision === HOMEWORK_SUBMISSION_ACCEPTED
            ? 'Работа принята'
            : 'Работа возвращена на доработку',
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('homework/review.php: ' . $error->getMessage());
    errorResponse('Не удалось сохранить результат проверки', 500);
}