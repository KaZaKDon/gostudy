<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/lesson-time.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Раздел доступен только преподавателю', 403);
}

try {
    $pdo = getDatabaseConnection();

    $timezoneStmt = $pdo->prepare("
        SELECT timezone
        FROM teacher_profiles
        WHERE user_id = :teacher_id
        LIMIT 1
    ");

    $timezoneStmt->execute([
        'teacher_id' => $user['id'],
    ]);

    $teacherTimezone = lessonResolveTimezone(
        $timezoneStmt->fetchColumn() ?: null
    );

    $relationsStmt = $pdo->prepare("
        SELECT
            ts.id,
            ts.student_id,
            ts.subject_id,
            ts.status,
            ts.started_at,
            ts.archived_at,
            u.full_name AS student_name,
            u.email AS student_email,
            u.phone AS student_phone,
            sp.class_level,
            sp.birth_year,
            sp.goal,
            sp.learning_goals,
            sp.level_description,
            sp.lesson_format,
            sp.preferred_time,
            sp.schedule_comment,
            sp.parent_name,
            sp.parent_phone,
            sp.parent_email,
            s.name AS subject_name,
            (
                SELECT MIN(l.lesson_date)
                FROM lessons l
                WHERE l.teacher_id = ts.teacher_id
                  AND l.student_id = ts.student_id
                  AND l.subject_id = ts.subject_id
                  AND l.status IN ('planned', 'active', 'rescheduled')
                  AND l.lesson_date >= :current_date_time
            ) AS next_lesson_at
        FROM teacher_students ts
        INNER JOIN users u
            ON u.id = ts.student_id
        LEFT JOIN student_profiles sp
            ON sp.user_id = ts.student_id
        LEFT JOIN subjects s
            ON s.id = ts.subject_id
        WHERE ts.teacher_id = :teacher_id
          AND ts.status IN ('active', 'archived')
        ORDER BY ts.status ASC, u.full_name ASC
    ");

    $relationsStmt->execute([
        'teacher_id' => $user['id'],
        'current_date_time' => lessonToStorageDateTime(
            new DateTimeImmutable('now', $teacherTimezone)
        ),
    ]);

    $students = [
        'active' => [],
        'archive' => [],
        'requests' => [],
    ];

    foreach ($relationsStmt->fetchAll(PDO::FETCH_ASSOC) as $student) {
        $student['next_lesson_at'] = lessonFromStorageDateTime(
            $student['next_lesson_at'] ?? null,
            $teacherTimezone
        );

        $group = $student['status'] === 'archived'
            ? 'archive'
            : 'active';

        $students[$group][] = $student;
    }

    $requestsStmt = $pdo->prepare("
        SELECT
            r.id,
            r.student_id,
            r.subject_id,
            r.message,
            r.status,
            r.created_at,
            u.full_name AS student_name,
            u.email AS student_email,
            u.phone AS student_phone,
            sp.class_level,
            sp.birth_year,
            sp.goal,
            sp.learning_goals,
            sp.level_description,
            sp.lesson_format,
            sp.preferred_time,
            sp.schedule_comment,
            sp.parent_name,
            sp.parent_phone,
            sp.parent_email,
            s.name AS subject_name
        FROM teacher_student_requests r
        INNER JOIN users u
            ON u.id = r.student_id
        LEFT JOIN student_profiles sp
            ON sp.user_id = r.student_id
        LEFT JOIN subjects s
            ON s.id = r.subject_id
        WHERE r.teacher_id = :teacher_id
          AND r.status = 'pending'
        ORDER BY r.created_at ASC, r.id ASC
    ");

    $requestsStmt->execute([
        'teacher_id' => $user['id'],
    ]);

    $students['requests'] = $requestsStmt->fetchAll(PDO::FETCH_ASSOC);

    successResponse([
        'students' => $students,
    ]);
} catch (Throwable $error) {
    error_log('teacher/students.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить учеников', 500);
}
