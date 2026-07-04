<?php

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];

try {
    $teacherId = (int) ($_GET['id'] ?? 0);

    if ($teacherId <= 0) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Не передан ID преподавателя',
        ], 400);
    }

    $stmt = $pdo->prepare("
        SELECT
            u.id AS id,
            u.full_name,
            u.email,
            u.phone,
            u.status,
            u.blocked_reason,
            u.last_login_at,
            u.created_at,
            u.updated_at,

            tp.id AS profile_id,
            tp.user_id,
            tp.photo_url,
            tp.city,
            tp.timezone,
            tp.headline,
            tp.experience_years,
            tp.education,
            tp.certificates,
            tp.about,
            tp.teaching_method,
            tp.first_lesson_description,
            tp.student_gets,
            tp.student_levels,
            tp.lesson_goals,
            tp.lesson_format,
            tp.price_per_lesson,
            tp.price_per_hour,
            tp.price_45,
            tp.price_60,
            tp.price_90,
            tp.trial_lesson_enabled,
            tp.intro_video_url,
            tp.schedule_description,
            tp.is_verified,
            tp.is_visible,
            tp.rating,
            tp.reviews_count,
            tp.verification_status,
            tp.profile_completion,
            tp.verification_comment,
            tp.verified_by,
            tp.verified_at

        FROM users u
        LEFT JOIN teacher_profiles tp
            ON tp.user_id = u.id
        WHERE u.id = :id
            AND u.role = 'teacher'
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $teacherId,
    ]);

    $teacher = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$teacher) {
        adminJsonResponse([
            'success' => false,
            'message' => 'Преподаватель не найден',
        ], 404);
    }

    $subjectsStmt = $pdo->prepare("
        SELECT
            s.id,
            s.name,
            s.slug,
            s.is_active,
            s.sort_order
        FROM teacher_subjects ts
        INNER JOIN subjects s
            ON s.id = ts.subject_id
        WHERE ts.teacher_id = :teacher_id
        ORDER BY s.sort_order ASC, s.name ASC
    ");

    $subjectsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $documentsStmt = $pdo->prepare("
        SELECT
            td.id,
            td.type,
            td.document_title,
            td.institution,
            td.document_year,
            td.file_url,
            td.original_name,
            td.status,
            td.reject_reason,
            td.checked_by,
            td.checked_at,
            td.created_at,
            td.updated_at,

            checker.full_name AS checked_by_name
        FROM teacher_documents td
        LEFT JOIN users checker
            ON checker.id = td.checked_by
        WHERE td.teacher_id = :teacher_id
        ORDER BY td.created_at DESC
    ");

    $documentsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $studentsStmt = $pdo->prepare("
        SELECT
            ts.id,
            ts.student_id,
            ts.subject_id,
            ts.status,
            ts.started_at,
            ts.archived_at,

            u.full_name,
            u.email,
            u.phone,

            s.name AS subject_name
        FROM teacher_students ts
        INNER JOIN users u
            ON u.id = ts.student_id
        LEFT JOIN subjects s
            ON s.id = ts.subject_id
        WHERE ts.teacher_id = :teacher_id
        ORDER BY ts.status ASC, u.full_name ASC
    ");

    $studentsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $reviewsStmt = $pdo->prepare("
        SELECT
            r.id,
            r.student_id,
            r.rating,
            r.text,
            r.status,
            r.created_at,

            u.full_name AS student_name
        FROM reviews r
        INNER JOIN users u
            ON u.id = r.student_id
        WHERE r.teacher_id = :teacher_id
        ORDER BY r.created_at DESC
        LIMIT 20
    ");

    $reviewsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $statsStmt = $pdo->prepare("
        SELECT
            (
                SELECT COUNT(*)
                FROM teacher_students ts
                WHERE ts.teacher_id = :teacher_id
                    AND ts.status = 'active'
            ) AS active_students_total,

            (
                SELECT COUNT(*)
                FROM lessons l
                WHERE l.teacher_id = :teacher_id
            ) AS lessons_total,

            (
                SELECT COUNT(*)
                FROM homework h
                WHERE h.teacher_id = :teacher_id
            ) AS homework_total,

            (
                SELECT COUNT(*)
                FROM teacher_documents td
                WHERE td.teacher_id = :teacher_id
            ) AS documents_total,

            (
                SELECT COUNT(*)
                FROM teacher_documents td
                WHERE td.teacher_id = :teacher_id
                    AND td.status = 'pending'
            ) AS pending_documents_total
    ");

    $statsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    adminJsonResponse([
        'success' => true,
        'data' => [
            'teacher' => $teacher,
            'stats' => $statsStmt->fetch(PDO::FETCH_ASSOC),
            'subjects' => $subjectsStmt->fetchAll(PDO::FETCH_ASSOC),
            'documents' => $documentsStmt->fetchAll(PDO::FETCH_ASSOC),
            'students' => $studentsStmt->fetchAll(PDO::FETCH_ASSOC),
            'reviews' => $reviewsStmt->fetchAll(PDO::FETCH_ASSOC),
        ],
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка получения карточки преподавателя',
        'error' => $error->getMessage(),
    ], 500);
}