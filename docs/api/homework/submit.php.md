<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/homework.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'student') {
    errorResponse('Отправлять работу может только ученик', 403);
}

homeworkValidateMultipartRequestSize();

$homeworkId = homeworkParsePositiveId($_POST['homework_id'] ?? null, 'задание');
$answerText = trim((string) ($_POST['answer_text'] ?? ''));
$files = homeworkReceiveFiles();
$storedPaths = [];

if ($answerText === '' && $files === []) {
    errorResponse('Напишите ответ или прикрепите файл');
}

if (mb_strlen($answerText) > 30000) {
    errorResponse('Ответ не должен превышать 30 000 символов');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $homework = homeworkFindForUser($pdo, $homeworkId, $user, true);

    if (!$homework) {
        errorResponse('Домашнее задание не найдено', 404);
    }

    if ($homework['status'] !== HOMEWORK_STATUS_ACTIVE) {
        errorResponse('Это задание больше нельзя отправить');
    }

    if (($homework['submission_status'] ?? null) === HOMEWORK_SUBMISSION_SUBMITTED) {
        errorResponse('Работа уже отправлена и ожидает проверки', 409);
    }

    if (($homework['submission_status'] ?? null) === HOMEWORK_SUBMISSION_ACCEPTED) {
        errorResponse('Работа уже принята', 409);
    }

    $attemptStmt = $pdo->prepare("
        SELECT COALESCE(MAX(attempt_number), 0) + 1
        FROM homework_submissions
        WHERE homework_id = :homework_id
    ");
    $attemptStmt->execute(['homework_id' => $homeworkId]);
    $attemptNumber = (int) $attemptStmt->fetchColumn();

    $insertStmt = $pdo->prepare("
        INSERT INTO homework_submissions (
            homework_id,
            student_id,
            attempt_number,
            answer_text,
            status
        ) VALUES (
            :homework_id,
            :student_id,
            :attempt_number,
            :answer_text,
            'submitted'
        )
    ");
    $insertStmt->execute([
        'homework_id' => $homeworkId,
        'student_id' => (int) $user['id'],
        'attempt_number' => $attemptNumber,
        'answer_text' => $answerText !== '' ? $answerText : null,
    ]);
    $submissionId = (int) $pdo->lastInsertId();

    homeworkStoreAttachments(
        $pdo,
        $files,
        'homework_submission_attachments',
        'submission_id',
        $submissionId,
        'homework/' . $homeworkId . '/attempt-' . $attemptNumber,
        $storedPaths
    );

    notificationCreate(
        $pdo,
        (int) $homework['teacher_id'],
        'homework_submitted',
        'Домашняя работа отправлена',
        $homework['student_name'] . ': ' . $homework['title'],
        NOTIFICATION_SECTION_HOMEWORK,
        'homework',
        $homeworkId
    );

    $pdo->commit();

    successResponse([
        'message' => 'Работа отправлена преподавателю',
        'submission_id' => $submissionId,
        'attempt_number' => $attemptNumber,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($storedPaths !== []) {
        homeworkDeleteStoredPaths($storedPaths);
    }

    error_log('homework/submit.php: ' . $error->getMessage());
    errorResponse('Не удалось отправить работу', 500);
}