<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/lesson-time.php';
require_once __DIR__ . '/../shared/lesson-management.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if (!in_array($user['role'], ['student', 'teacher'], true)) {
    errorResponse('Расписание доступно только ученику или преподавателю', 403);
}

$dateFrom = trim((string) ($_GET['from'] ?? ''));
$dateTo = trim((string) ($_GET['to'] ?? ''));

if (
    !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)
    || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)
) {
    errorResponse('Укажите период расписания в формате YYYY-MM-DD');
}

$fromDate = DateTimeImmutable::createFromFormat(
    '!Y-m-d',
    $dateFrom,
    lessonPlatformTimezone()
);
$toDate = DateTimeImmutable::createFromFormat(
    '!Y-m-d',
    $dateTo,
    lessonPlatformTimezone()
);

if (
    !$fromDate
    || !$toDate
    || $fromDate->format('Y-m-d') !== $dateFrom
    || $toDate->format('Y-m-d') !== $dateTo
) {
    errorResponse('Указан некорректный период расписания');
}

if ($toDate < $fromDate) {
    errorResponse('Дата окончания периода меньше даты начала');
}

if ((int) $fromDate->diff($toDate)->format('%a') > 31) {
    errorResponse('За один запрос можно получить не более 32 дней расписания');
}

$participantColumn = $user['role'] === 'teacher'
    ? 'lessons.teacher_id'
    : 'lessons.student_id';

try {
    $pdo = getDatabaseConnection();

    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);

    $viewerFromDate = DateTimeImmutable::createFromFormat(
        '!Y-m-d',
        $dateFrom,
        $viewerTimezone
    );
    $viewerToDate = DateTimeImmutable::createFromFormat(
        '!Y-m-d',
        $dateTo,
        $viewerTimezone
    );

    $storageDateFrom = lessonToStorageDateTime($viewerFromDate);
    $storageDateToExclusive = lessonToStorageDateTime(
        $viewerToDate->modify('+1 day')
    );

    $stmt = $pdo->prepare("
        SELECT
            lessons.id,
            lessons.teacher_id,
            lessons.student_id,
            lessons.subject_id,
            lessons.title,
            lessons.lesson_date,
            lessons.duration_minutes,
            lessons.status,
            lessons.lesson_topic,
            lessons.lesson_notes,
            subjects.name AS subject_name,
            teachers.full_name AS teacher_name,
            students.full_name AS student_name,
            change_requests.id AS change_request_id,
            change_requests.requested_by AS change_requested_by,
            change_requests.requested_role AS change_requested_role,
            change_requests.request_type AS change_request_type,
            change_requests.status AS change_request_status,
            change_requests.original_lesson_date AS change_original_lesson_date,
            change_requests.proposed_lesson_date AS change_proposed_lesson_date,
            change_requests.request_comment AS change_request_comment,
            change_requests.response_comment AS change_response_comment,
            change_requests.responded_by AS change_responded_by,
            change_requests.responded_at AS change_responded_at,
            change_requests.created_at AS change_created_at,
            requesters.full_name AS change_requester_name,
            history_requests.id AS history_id,
            history_requests.requested_by AS history_requested_by,
            history_requests.requested_role AS history_requested_role,
            history_requests.request_type AS history_request_type,
            history_requests.status AS history_status,
            history_requests.original_lesson_date AS history_original_lesson_date,
            history_requests.proposed_lesson_date AS history_proposed_lesson_date,
            history_requests.request_comment AS history_request_comment,
            history_requests.response_comment AS history_response_comment,
            history_requests.responded_by AS history_responded_by,
            history_requests.responded_at AS history_responded_at,
            history_requests.created_at AS history_created_at,
            history_requesters.full_name AS history_requester_name
        FROM lessons
        LEFT JOIN subjects
            ON subjects.id = lessons.subject_id
        INNER JOIN users AS teachers
            ON teachers.id = lessons.teacher_id
        INNER JOIN users AS students
            ON students.id = lessons.student_id
        LEFT JOIN lesson_change_requests AS change_requests
            ON change_requests.lesson_id = lessons.id
           AND change_requests.status = 'pending'
        LEFT JOIN users AS requesters
            ON requesters.id = change_requests.requested_by
        LEFT JOIN lesson_change_requests AS history_requests
            ON history_requests.id = (
                SELECT MAX(history_source.id)
                FROM lesson_change_requests AS history_source
                WHERE history_source.lesson_id = lessons.id
                  AND history_source.status <> 'pending'
            )
        LEFT JOIN users AS history_requesters
            ON history_requesters.id = history_requests.requested_by
        WHERE {$participantColumn} = :user_id
          AND lessons.lesson_date >= :date_from
          AND lessons.lesson_date < :date_to_exclusive
        ORDER BY lessons.lesson_date ASC, lessons.id ASC
    ");

    $stmt->execute([
        'user_id' => $user['id'],
        'date_from' => $storageDateFrom,
        'date_to_exclusive' => $storageDateToExclusive,
    ]);

    $schedule = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($schedule as &$lesson) {
        $lesson['lesson_date'] = lessonFromStorageDateTime(
            $lesson['lesson_date'] ?? null,
            $viewerTimezone
        );

        if ($lesson['change_request_id'] !== null) {
            $lesson['change_request'] = lessonChangeRequestResponse(
                [
                    'id' => $lesson['change_request_id'],
                    'lesson_id' => $lesson['id'],
                    'requested_by' => $lesson['change_requested_by'],
                    'requested_role' => $lesson['change_requested_role'],
                    'requester_name' => $lesson['change_requester_name'],
                    'request_type' => $lesson['change_request_type'],
                    'status' => $lesson['change_request_status'],
                    'original_lesson_date' => $lesson['change_original_lesson_date'],
                    'proposed_lesson_date' => $lesson['change_proposed_lesson_date'],
                    'request_comment' => $lesson['change_request_comment'],
                    'response_comment' => $lesson['change_response_comment'],
                    'responded_by' => $lesson['change_responded_by'],
                    'responded_at' => $lesson['change_responded_at'],
                    'created_at' => $lesson['change_created_at'],
                ],
                $viewerTimezone,
                (int) $user['id']
            );
        } else {
            $lesson['change_request'] = null;
        }

        if ($lesson['history_id'] !== null) {
            $lesson['last_change'] = lessonChangeRequestResponse(
                [
                    'id' => $lesson['history_id'],
                    'lesson_id' => $lesson['id'],
                    'requested_by' => $lesson['history_requested_by'],
                    'requested_role' => $lesson['history_requested_role'],
                    'requester_name' => $lesson['history_requester_name'],
                    'request_type' => $lesson['history_request_type'],
                    'status' => $lesson['history_status'],
                    'original_lesson_date' => $lesson['history_original_lesson_date'],
                    'proposed_lesson_date' => $lesson['history_proposed_lesson_date'],
                    'request_comment' => $lesson['history_request_comment'],
                    'response_comment' => $lesson['history_response_comment'],
                    'responded_by' => $lesson['history_responded_by'],
                    'responded_at' => $lesson['history_responded_at'],
                    'created_at' => $lesson['history_created_at'],
                ],
                $viewerTimezone,
                (int) $user['id']
            );
        } else {
            $lesson['last_change'] = null;
        }

        foreach (array_keys($lesson) as $key) {
            if (
                $key !== 'change_request'
                && str_starts_with($key, 'change_')
            ) {
                unset($lesson[$key]);
            }

            if (str_starts_with($key, 'history_')) {
                unset($lesson[$key]);
            }
        }
    }
    unset($lesson);

    successResponse([
        'schedule' => $schedule,
        'period' => [
            'from' => $dateFrom,
            'to' => $dateTo,
            'timezone' => $viewerTimezone->getName(),
        ],
    ]);
} catch (Throwable $error) {
    error_log('lessons/schedule.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить расписание', 500);
}
