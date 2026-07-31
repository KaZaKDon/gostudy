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
    errorResponse('Изменять статус обучения может только преподаватель', 403);
}

$data = getJsonInput();
$relationId = filter_var(
    $data['relation_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);
$action = trim((string) ($data['action'] ?? ''));

if ($relationId === false) {
    errorResponse('Не указан ученик');
}

if (!in_array($action, ['archive', 'restore'], true)) {
    errorResponse('Некорректное действие');
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $relationStmt = $pdo->prepare("
        SELECT
            ts.id,
            ts.student_id,
            ts.subject_id,
            ts.status,
            subjects.name AS subject_name
        FROM teacher_students ts
        INNER JOIN subjects
            ON subjects.id = ts.subject_id
        WHERE ts.id = :relation_id
          AND ts.teacher_id = :teacher_id
        LIMIT 1
        FOR UPDATE
    ");
    $relationStmt->execute([
        'relation_id' => (int) $relationId,
        'teacher_id' => (int) $user['id'],
    ]);
    $relation = $relationStmt->fetch(PDO::FETCH_ASSOC);

    if (!$relation) {
        errorResponse('Связь с учеником не найдена', 404);
    }

    $expectedStatus = $action === 'archive' ? 'active' : 'archived';
    $targetStatus = $action === 'archive' ? 'archived' : 'active';

    if ($relation['status'] === $targetStatus) {
        $pdo->commit();
        successResponse([
            'message' => $action === 'archive'
                ? 'Обучение уже завершено'
                : 'Обучение уже возобновлено',
            'status' => $targetStatus,
        ]);
    }

    if ($relation['status'] !== $expectedStatus) {
        errorResponse('Статус обучения уже изменён', 409);
    }

    if ($action === 'archive') {
        $futureLessonsStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM lessons
            WHERE teacher_id = :teacher_id
              AND student_id = :student_id
              AND subject_id = :subject_id
              AND status IN ('scheduled', 'rescheduled')
              AND lesson_date >= CURRENT_TIMESTAMP
        ");
        $futureLessonsStmt->execute([
            'teacher_id' => (int) $user['id'],
            'student_id' => (int) $relation['student_id'],
            'subject_id' => (int) $relation['subject_id'],
        ]);

        if ((int) $futureLessonsStmt->fetchColumn() > 0) {
            errorResponse(
                'Сначала отмените будущие уроки с этим учеником',
                409
            );
        }
    }

    $updateStmt = $pdo->prepare("
        UPDATE teacher_students
        SET
            status = :status,
            archived_at = CASE
                WHEN :archive_action = 1 THEN CURRENT_TIMESTAMP
                ELSE NULL
            END,
            started_at = CASE
                WHEN :restore_action = 1
                THEN COALESCE(started_at, CURRENT_TIMESTAMP)
                ELSE started_at
            END
        WHERE id = :relation_id
    ");
    $updateStmt->execute([
        'status' => $targetStatus,
        'archive_action' => $action === 'archive' ? 1 : 0,
        'restore_action' => $action === 'restore' ? 1 : 0,
        'relation_id' => (int) $relationId,
    ]);

    notificationCreate(
        $pdo,
        (int) $relation['student_id'],
        $action === 'archive'
            ? 'learning_archived'
            : 'learning_restored',
        $action === 'archive'
            ? 'Обучение завершено'
            : 'Обучение возобновлено',
        $user['full_name']
            . ($action === 'archive'
                ? ' завершил(а) обучение'
                : ' возобновил(а) обучение')
            . ' по предмету «' . $relation['subject_name'] . '».',
        NOTIFICATION_SECTION_TEACHERS,
        'teacher_student',
        (int) $relationId
    );

    $pdo->commit();

    successResponse([
        'message' => $action === 'archive'
            ? 'Обучение завершено'
            : 'Обучение возобновлено',
        'status' => $targetStatus,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('teacher/update-student-status.php: ' . $error->getMessage());
    errorResponse('Не удалось изменить статус обучения', 500);
}
