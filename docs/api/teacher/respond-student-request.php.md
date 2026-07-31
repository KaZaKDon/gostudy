<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/notifications.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Заявку может обработать только преподаватель', 403);
}

$data = getJsonInput();

$requestId = (int) ($data['request_id'] ?? 0);
$action = trim((string) ($data['action'] ?? ''));

if ($requestId <= 0) {
    errorResponse('Не указана заявка');
}

if (!in_array($action, ['accept', 'reject'], true)) {
    errorResponse('Некорректное действие');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $requestStmt = $pdo->prepare("
        SELECT
            r.id,
            r.student_id,
            r.teacher_id,
            r.subject_id,
            r.status,
            subjects.name AS subject_name
        FROM teacher_student_requests r
        INNER JOIN users student
            ON student.id = r.student_id
        INNER JOIN subjects
            ON subjects.id = r.subject_id
        WHERE r.id = :request_id
          AND r.teacher_id = :teacher_id
          AND student.role = 'student'
          AND student.status = 'active'
        LIMIT 1
        FOR UPDATE
    ");

    $requestStmt->execute([
        'request_id' => $requestId,
        'teacher_id' => $user['id'],
    ]);

    $request = $requestStmt->fetch(PDO::FETCH_ASSOC);

    if (!$request) {
        errorResponse('Заявка не найдена', 404);
    }

    $targetStatus = $action === 'accept'
        ? 'accepted'
        : 'rejected';

    if ($request['status'] === $targetStatus) {
        $pdo->commit();

        successResponse([
            'message' => $action === 'accept'
                ? 'Заявка уже принята'
                : 'Заявка уже отклонена',
            'status' => $targetStatus,
        ]);
    }

    if ($request['status'] !== 'pending') {
        errorResponse('Заявка уже обработана', 409);
    }

    if ($action === 'accept') {
        $relationStmt = $pdo->prepare("
            SELECT id
            FROM teacher_students
            WHERE teacher_id = :teacher_id
              AND student_id = :student_id
              AND subject_id = :subject_id
            LIMIT 1
            FOR UPDATE
        ");

        $relationStmt->execute([
            'teacher_id' => $user['id'],
            'student_id' => (int) $request['student_id'],
            'subject_id' => (int) $request['subject_id'],
        ]);

        $relationId = $relationStmt->fetchColumn();

        if ($relationId) {
            $saveRelationStmt = $pdo->prepare("
                UPDATE teacher_students
                SET
                    status = 'active',
                    started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                    archived_at = NULL
                WHERE id = :id
            ");

            $saveRelationStmt->execute([
                'id' => (int) $relationId,
            ]);
        } else {
            $saveRelationStmt = $pdo->prepare("
                INSERT INTO teacher_students (
                    teacher_id,
                    student_id,
                    subject_id,
                    status,
                    started_at
                ) VALUES (
                    :teacher_id,
                    :student_id,
                    :subject_id,
                    'active',
                    CURRENT_TIMESTAMP
                )
            ");

            $saveRelationStmt->execute([
                'teacher_id' => $user['id'],
                'student_id' => (int) $request['student_id'],
                'subject_id' => (int) $request['subject_id'],
            ]);
        }
    }

    $updateRequestStmt = $pdo->prepare("
        UPDATE teacher_student_requests
        SET
            status = :status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ");

    $updateRequestStmt->execute([
        'status' => $targetStatus,
        'id' => $requestId,
    ]);

    notificationCreate(
        $pdo,
        (int) $request['student_id'],
        $action === 'accept'
            ? 'teacher_request_accepted'
            : 'teacher_request_rejected',
        $action === 'accept'
            ? 'Преподаватель принял заявку'
            : 'Преподаватель отклонил заявку',
        $user['full_name']
            . ($action === 'accept' ? ' принял(а)' : ' отклонил(а)')
            . ' вашу заявку по предмету «'
            . $request['subject_name'] . '».',
        NOTIFICATION_SECTION_TEACHERS,
        'teacher_request',
        $requestId
    );

    $pdo->commit();

    successResponse([
        'message' => $action === 'accept'
            ? 'Заявка принята, ученик добавлен'
            : 'Заявка отклонена',
        'status' => $targetStatus,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('teacher/respond-student-request.php: ' . $error->getMessage());
    errorResponse('Не удалось обработать заявку', 500);
}
