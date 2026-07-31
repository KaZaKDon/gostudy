<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'student') {
    errorResponse('Заявку может отправить только ученик', 403);
}

$data = getJsonInput();

$teacherId = (int) ($data['teacher_id'] ?? 0);
$subjectId = (int) ($data['subject_id'] ?? 0);
$message = trim((string) ($data['message'] ?? ''));

if ($teacherId <= 0) {
    errorResponse('Не указан преподаватель');
}

if ($subjectId <= 0) {
    errorResponse('Выберите предмет');
}

if (mb_strlen($message) > 1000) {
    errorResponse('Сообщение не должно превышать 1000 символов');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $teacherStmt = $pdo->prepare("
        SELECT tp.user_id
        FROM teacher_profiles tp
        INNER JOIN users u
            ON u.id = tp.user_id
        INNER JOIN teacher_subjects ts
            ON ts.teacher_id = tp.user_id
           AND ts.subject_id = :subject_id
        INNER JOIN subjects s
            ON s.id = ts.subject_id
        WHERE tp.user_id = :teacher_id
          AND u.role = 'teacher'
          AND u.status = 'active'
          AND tp.is_visible = 1
          AND tp.verification_status = 'approved'
          AND s.is_active = 1
        LIMIT 1
    ");

    $teacherStmt->execute([
        'teacher_id' => $teacherId,
        'subject_id' => $subjectId,
    ]);

    if (!$teacherStmt->fetchColumn()) {
        errorResponse('Преподаватель или выбранный предмет недоступен', 404);
    }

    $relationStmt = $pdo->prepare("
        SELECT id
        FROM teacher_students
        WHERE teacher_id = :teacher_id
          AND student_id = :student_id
          AND subject_id = :subject_id
          AND status = 'active'
        LIMIT 1
        FOR UPDATE
    ");

    $relationStmt->execute([
        'teacher_id' => $teacherId,
        'student_id' => $user['id'],
        'subject_id' => $subjectId,
    ]);

    if ($relationStmt->fetchColumn()) {
        errorResponse('Этот преподаватель уже ведёт у вас выбранный предмет', 409);
    }

    $requestStmt = $pdo->prepare("
        SELECT id, status
        FROM teacher_student_requests
        WHERE teacher_id = :teacher_id
          AND student_id = :student_id
          AND subject_id = :subject_id
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
    ");

    $requestStmt->execute([
        'teacher_id' => $teacherId,
        'student_id' => $user['id'],
        'subject_id' => $subjectId,
    ]);

    $existingRequest = $requestStmt->fetch(PDO::FETCH_ASSOC);

    if ($existingRequest && $existingRequest['status'] === 'pending') {
        $pdo->commit();

        successResponse([
            'message' => 'Заявка уже отправлена преподавателю',
            'request' => [
                'id' => (int) $existingRequest['id'],
                'status' => 'pending',
            ],
        ]);
    }

    if ($existingRequest) {
        $saveStmt = $pdo->prepare("
            UPDATE teacher_student_requests
            SET
                message = :message,
                status = 'pending',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");

        $saveStmt->execute([
            'message' => $message !== '' ? $message : null,
            'id' => (int) $existingRequest['id'],
        ]);

        $requestId = (int) $existingRequest['id'];
    } else {
        $saveStmt = $pdo->prepare("
            INSERT INTO teacher_student_requests (
                student_id,
                teacher_id,
                subject_id,
                message,
                status
            ) VALUES (
                :student_id,
                :teacher_id,
                :subject_id,
                :message,
                'pending'
            )
        ");

        $saveStmt->execute([
            'student_id' => $user['id'],
            'teacher_id' => $teacherId,
            'subject_id' => $subjectId,
            'message' => $message !== '' ? $message : null,
        ]);

        $requestId = (int) $pdo->lastInsertId();
    }

    $pdo->commit();

    successResponse([
        'message' => 'Заявка отправлена преподавателю',
        'request' => [
            'id' => $requestId,
            'status' => 'pending',
        ],
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('student/send-teacher-request.php: ' . $error->getMessage());
    errorResponse('Не удалось отправить заявку преподавателю', 500);
}
