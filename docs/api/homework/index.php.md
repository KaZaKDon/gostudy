<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/homework.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if (!in_array($user['role'], ['teacher', 'student'], true)) {
    errorResponse('Домашние задания недоступны для этой роли', 403);
}

try {
    $pdo = getDatabaseConnection();
    $timezone = homeworkUserTimezone(
        $pdo,
        (int) $user['id'],
        (string) $user['role']
    );
    $participantColumn = $user['role'] === 'teacher'
        ? 'h.teacher_id'
        : 'h.student_id';

    $stmt = $pdo->prepare(homeworkBaseSelect() . "
        WHERE {$participantColumn} = :user_id
          AND h.status <> 'cancelled'
        ORDER BY
            CASE
                WHEN hs.status = 'submitted' THEN 1
                WHEN h.status = 'active'
                     AND h.due_date IS NOT NULL
                     AND h.due_date < CURRENT_TIMESTAMP THEN 2
                WHEN h.status = 'active' THEN 3
                ELSE 4
            END,
            h.due_date IS NULL ASC,
            h.due_date ASC,
            h.id DESC
    ");
    $stmt->execute(['user_id' => (int) $user['id']]);

    $homework = array_map(
        static fn (array $row): array => homeworkNormalizeRow($row, $timezone),
        $stmt->fetchAll(PDO::FETCH_ASSOC)
    );

    $actionableCount = count(array_filter(
        $homework,
        static fn (array $item): bool => $user['role'] === 'teacher'
            ? $item['display_status'] === 'review'
            : (
                $item['status'] === HOMEWORK_STATUS_ACTIVE
                && ($item['viewed_at'] === null || $item['submission_status'] === HOMEWORK_SUBMISSION_RETURNED)
            )
    ));

    successResponse([
        'homework' => $homework,
        'actionable_count' => $actionableCount,
        'timezone' => $timezone->getName(),
        'upload_limits' => [
            'max_files' => HOMEWORK_MAX_FILES,
            'max_file_bytes' => effectiveUploadMaxBytes(
                'UPLOAD_HOMEWORK_MAX_BYTES',
                10 * 1024 * 1024
            ),
            'max_total_bytes' => effectivePostMaxBytes(
                'UPLOAD_HOMEWORK_TOTAL_MAX_BYTES',
                30 * 1024 * 1024
            ),
        ],
    ]);
} catch (Throwable $error) {
    error_log('homework/index.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить домашние задания', 500);
}