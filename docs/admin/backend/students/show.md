<?php

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];

try {
    $studentId = (int) ($_GET['id'] ?? 0);

    if ($studentId <= 0) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не передан ID ученика',
        ], 400);
    }

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.full_name,
            u.email,
            u.phone,
            u.status,
            u.blocked_reason,
            u.last_login_at,
            u.created_at,
            u.updated_at,

            sp.birth_year,
            sp.class_level,
            sp.goal,
            sp.level_description,
            sp.parent_name,
            sp.parent_phone,
            sp.messenger,
            sp.preferred_time,
            sp.about

        FROM users u
        LEFT JOIN student_profiles sp
            ON sp.user_id = u.id
        WHERE u.id = :id
            AND u.role = 'student'
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $studentId,
    ]);

    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Ученик не найден',
        ], 404);
    }

    $stats = [
        'teachers_total' => 0,
        'requests_total' => 0,
        'lessons_total' => 0,
        'homework_total' => 0,
        'messages_total' => 0,
    ];

    $teachersCountStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM teacher_students
        WHERE student_id = :student_id
            AND status = 'active'
    ");
    $teachersCountStmt->execute([
        'student_id' => $studentId,
    ]);
    $stats['teachers_total'] = (int) $teachersCountStmt->fetchColumn();

    $requestsCountStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM teacher_student_requests
        WHERE student_id = :student_id
    ");
    $requestsCountStmt->execute([
        'student_id' => $studentId,
    ]);
    $stats['requests_total'] = (int) $requestsCountStmt->fetchColumn();

    $lessonsCountStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM lessons
        WHERE student_id = :student_id
    ");
    $lessonsCountStmt->execute([
        'student_id' => $studentId,
    ]);
    $stats['lessons_total'] = (int) $lessonsCountStmt->fetchColumn();

    $homeworkCountStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM homework
        WHERE student_id = :student_id
    ");
    $homeworkCountStmt->execute([
        'student_id' => $studentId,
    ]);
    $stats['homework_total'] = (int) $homeworkCountStmt->fetchColumn();

    $messagesCountStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM messages
        WHERE sender_id = :student_id
    ");
    $messagesCountStmt->execute([
        'student_id' => $studentId,
    ]);
    $stats['messages_total'] = (int) $messagesCountStmt->fetchColumn();

    $teachersStmt = $pdo->prepare("
        SELECT
            ts.id,
            ts.teacher_id,
            ts.subject_id,
            ts.status,
            ts.started_at,
            ts.archived_at,

            t.full_name AS teacher_name,
            t.email AS teacher_email,
            t.phone AS teacher_phone,

            s.name AS subject_name,
            s.slug AS subject_slug

        FROM teacher_students ts
        INNER JOIN users t
            ON t.id = ts.teacher_id
        LEFT JOIN subjects s
            ON s.id = ts.subject_id
        WHERE ts.student_id = :student_id
        ORDER BY ts.status ASC, t.full_name ASC
    ");

    $teachersStmt->execute([
        'student_id' => $studentId,
    ]);

    $teachers = $teachersStmt->fetchAll(PDO::FETCH_ASSOC);

    $requestsStmt = $pdo->prepare("
        SELECT
            tsr.id,
            tsr.teacher_id,
            tsr.subject_id,
            tsr.message,
            tsr.status,
            tsr.created_at,
            tsr.updated_at,

            t.full_name AS teacher_name,
            t.email AS teacher_email,

            s.name AS subject_name,
            s.slug AS subject_slug

        FROM teacher_student_requests tsr
        INNER JOIN users t
            ON t.id = tsr.teacher_id
        LEFT JOIN subjects s
            ON s.id = tsr.subject_id
        WHERE tsr.student_id = :student_id
        ORDER BY tsr.created_at DESC
        LIMIT 20
    ");

    $requestsStmt->execute([
        'student_id' => $studentId,
    ]);

    $requests = $requestsStmt->fetchAll(PDO::FETCH_ASSOC);

    $lessonsStmt = $pdo->prepare("
        SELECT
            l.id,
            l.teacher_id,
            l.subject_id,
            l.title,
            l.lesson_date,
            l.duration_minutes,
            l.status,
            l.lesson_topic,
            l.created_at,

            t.full_name AS teacher_name,
            s.name AS subject_name,
            s.slug AS subject_slug

        FROM lessons l
        INNER JOIN users t
            ON t.id = l.teacher_id
        LEFT JOIN subjects s
            ON s.id = l.subject_id
        WHERE l.student_id = :student_id
        ORDER BY l.lesson_date DESC
        LIMIT 20
    ");

    $lessonsStmt->execute([
        'student_id' => $studentId,
    ]);

    $lessons = $lessonsStmt->fetchAll(PDO::FETCH_ASSOC);

    $homeworkStmt = $pdo->prepare("
        SELECT
            h.id,
            h.lesson_id,
            h.teacher_id,
            h.title,
            h.description,
            h.due_date,
            h.status,
            h.created_at,
            h.updated_at,

            t.full_name AS teacher_name,

            l.subject_id,
            s.name AS subject_name,
            s.slug AS subject_slug,

            hs.status AS submission_status,
            hs.grade,
            hs.teacher_comment,
            hs.submitted_at

        FROM homework h
        INNER JOIN users t
            ON t.id = h.teacher_id
        LEFT JOIN lessons l
            ON l.id = h.lesson_id
        LEFT JOIN subjects s
            ON s.id = l.subject_id
        LEFT JOIN homework_submissions hs
            ON hs.homework_id = h.id
            AND hs.student_id = h.student_id
        WHERE h.student_id = :student_id
        ORDER BY h.created_at DESC
        LIMIT 20
    ");

    $homeworkStmt->execute([
        'student_id' => $studentId,
    ]);

    $homework = $homeworkStmt->fetchAll(PDO::FETCH_ASSOC);

    adminJsonResponse([
        'success' => true,
        'data' => [
            'student' => $student,
            'stats' => $stats,
            'teachers' => $teachers,
            'requests' => $requests,
            'lessons' => $lessons,
            'homework' => $homework,
        ],
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка получения карточки ученика',
        'error' => $error->getMessage(),
    ], 500);
}