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

if ($user['role'] !== 'teacher') {
    errorResponse('Выдавать задания может только преподаватель', 403);
}

homeworkValidateMultipartRequestSize();

$relationId = homeworkParsePositiveId($_POST['relation_id'] ?? null, 'ученик и предмет');
$lessonIdInput = trim((string) ($_POST['lesson_id'] ?? ''));
$lessonId = $lessonIdInput === ''
    ? null
    : homeworkParsePositiveId($lessonIdInput, 'урок');
$title = trim((string) ($_POST['title'] ?? ''));
$description = trim((string) ($_POST['description'] ?? ''));
$dueDateInput = trim((string) ($_POST['due_date'] ?? ''));

if ($title === '' || mb_strlen($title) > 255) {
    errorResponse('Укажите название задания до 255 символов');
}

if ($description === '' || mb_strlen($description) > 20000) {
    errorResponse('Укажите описание задания до 20 000 символов');
}

$files = homeworkReceiveFiles();
$storedPaths = [];

try {
    $pdo = getDatabaseConnection();
    $timezone = homeworkUserTimezone($pdo, (int) $user['id'], 'teacher');
    $dueDate = $dueDateInput === ''
        ? null
        : lessonParseLocalDateTime($dueDateInput, $timezone);

    if ($dueDateInput !== '' && !$dueDate) {
        errorResponse('Укажите корректные дату и время сдачи');
    }

    $minimumDueDate = new DateTimeImmutable('+24 hours', $timezone);

    if ($dueDate && $dueDate < $minimumDueDate) {
        errorResponse('На выполнение задания нужно дать не менее 24 часов');
    }

    $relationStmt = $pdo->prepare("
        SELECT
            ts.student_id,
            ts.subject_id,
            students.full_name AS student_name,
            students.email AS student_email,
            subjects.name AS subject_name,
            sp.parent_name,
            sp.parent_email,
            sp.parent_notifications_enabled
        FROM teacher_students ts
        INNER JOIN users students
            ON students.id = ts.student_id
           AND students.status = 'active'
        INNER JOIN subjects
            ON subjects.id = ts.subject_id
           AND subjects.is_active = 1
        LEFT JOIN student_profiles sp ON sp.user_id = ts.student_id
        WHERE ts.id = :relation_id
          AND ts.teacher_id = :teacher_id
          AND ts.status = 'active'
        LIMIT 1
    ");
    $relationStmt->execute([
        'relation_id' => $relationId,
        'teacher_id' => (int) $user['id'],
    ]);
    $relation = $relationStmt->fetch(PDO::FETCH_ASSOC);

    if (!$relation) {
        errorResponse('Активная связь с учеником не найдена', 404);
    }

    if ($lessonId !== null) {
        $lessonStmt = $pdo->prepare("
            SELECT id
            FROM lessons
            WHERE id = :lesson_id
              AND teacher_id = :teacher_id
              AND student_id = :student_id
              AND subject_id = :subject_id
              AND status <> 'cancelled'
            LIMIT 1
        ");
        $lessonStmt->execute([
            'lesson_id' => $lessonId,
            'teacher_id' => (int) $user['id'],
            'student_id' => (int) $relation['student_id'],
            'subject_id' => (int) $relation['subject_id'],
        ]);

        if (!$lessonStmt->fetchColumn()) {
            errorResponse('Урок не соответствует выбранному ученику и предмету');
        }
    }

    $storageDueDate = $dueDate ? lessonToStorageDateTime($dueDate) : null;
    $pdo->beginTransaction();

    $insertStmt = $pdo->prepare("
        INSERT INTO homework (
            lesson_id,
            teacher_id,
            student_id,
            subject_id,
            title,
            description,
            due_date,
            status
        ) VALUES (
            :lesson_id,
            :teacher_id,
            :student_id,
            :subject_id,
            :title,
            :description,
            :due_date,
            'active'
        )
    ");
    $insertStmt->execute([
        'lesson_id' => $lessonId,
        'teacher_id' => (int) $user['id'],
        'student_id' => (int) $relation['student_id'],
        'subject_id' => (int) $relation['subject_id'],
        'title' => $title,
        'description' => $description,
        'due_date' => $storageDueDate,
    ]);
    $homeworkId = (int) $pdo->lastInsertId();

    homeworkStoreAttachments(
        $pdo,
        $files,
        'homework_attachments',
        'homework_id',
        $homeworkId,
        'homework/' . $homeworkId . '/assignment',
        $storedPaths
    );

    notificationCreate(
        $pdo,
        (int) $relation['student_id'],
        'homework_assigned',
        'Новое домашнее задание',
        $relation['subject_name'] . ': ' . $title,
        NOTIFICATION_SECTION_HOMEWORK,
        'homework',
        $homeworkId
    );

    $emailHomework = [
        'id' => $homeworkId,
        'student_name' => $relation['student_name'],
        'teacher_name' => $user['full_name'],
        'subject_name' => $relation['subject_name'],
        'title' => $title,
        'due_date' => $storageDueDate,
        'due_date_local' => $dueDate ? $dueDate->format('d.m.Y H:i') : null,
    ];
    $deliveryIds = [];
    $studentDeliveryId = homeworkQueueEmail(
        $pdo,
        'assigned:' . $homeworkId . ':student',
        $homeworkId,
        null,
        'student',
        (string) $relation['student_email'],
        'assigned',
        homeworkEmailPayload(
            $emailHomework,
            'assigned',
            (string) $relation['student_email'],
            (string) $relation['student_name']
        )
    );

    if ($studentDeliveryId !== null) {
        $deliveryIds[] = $studentDeliveryId;
    }

    if (
        (bool) $relation['parent_notifications_enabled']
        && !empty($relation['parent_email'])
    ) {
        $parentDeliveryId = homeworkQueueEmail(
            $pdo,
            'assigned:' . $homeworkId . ':parent',
            $homeworkId,
            null,
            'parent',
            (string) $relation['parent_email'],
            'assigned',
            homeworkEmailPayload(
                $emailHomework,
                'assigned',
                (string) $relation['parent_email'],
                trim((string) $relation['parent_name']) !== ''
                    ? (string) $relation['parent_name']
                    : 'родитель'
            )
        );

        if ($parentDeliveryId !== null) {
            $deliveryIds[] = $parentDeliveryId;
        }
    }

    $pdo->commit();

    try {
        homeworkProcessEmailQueue($pdo, $deliveryIds);
    } catch (Throwable $mailError) {
        error_log('homework/create mail: ' . $mailError->getMessage());
    }

    successResponse([
        'message' => 'Домашнее задание выдано',
        'homework_id' => $homeworkId,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($storedPaths !== []) {
        homeworkDeleteStoredPaths($storedPaths);
    }

    error_log('homework/create.php: ' . $error->getMessage());
    errorResponse('Не удалось выдать домашнее задание', 500);
}