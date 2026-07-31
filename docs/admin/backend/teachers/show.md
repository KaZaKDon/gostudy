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
            tp.about,
            tp.teaching_method,
            tp.first_lesson_description,
            tp.student_gets,
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

    $preparationsStmt = $pdo->prepare("
        SELECT
            tsp.subject_id,
            s.name AS subject_name,
            tsp.preparation_id,
            p.name AS preparation_name,
            pg.id AS preparation_group_id,
            pg.name AS preparation_group_name
        FROM teacher_subject_preparations tsp
        INNER JOIN subjects s
            ON s.id = tsp.subject_id
        INNER JOIN preparations p
            ON p.id = tsp.preparation_id
        INNER JOIN preparation_groups pg
            ON pg.id = p.group_id
        WHERE tsp.teacher_id = :teacher_id
        ORDER BY
            s.sort_order ASC,
            s.name ASC,
            pg.sort_order ASC,
            p.sort_order ASC,
            p.name ASC
    ");

    $preparationsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $ageGroupsStmt = $pdo->prepare("
        SELECT
            sag.id,
            sag.name,
            sag.slug
        FROM teacher_age_groups tag
        INNER JOIN student_age_groups sag
            ON sag.id = tag.age_group_id
        WHERE tag.teacher_id = :teacher_id
        ORDER BY sag.sort_order ASC, sag.name ASC
    ");

    $ageGroupsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $educationStmt = $pdo->prepare("
        SELECT
            id,
            institution,
            faculty,
            speciality,
            qualification,
            graduation_year,
            description,
            is_primary,
            sort_order,
            created_at,
            updated_at
        FROM teacher_education
        WHERE teacher_id = :teacher_id
        ORDER BY is_primary DESC, sort_order ASC, id ASC
    ");

    $educationStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $documentsStmt = $pdo->prepare("
        SELECT
            td.id,
            td.type,
            td.document_title,
            td.institution,
            td.document_year,
            td.original_name,
            td.mime_type,
            td.file_size,
            CONCAT(
                '/api/admin/teacher-documents/download.php?id=',
                td.id
            ) AS download_url,
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
            'subject_preparations' => $preparationsStmt->fetchAll(PDO::FETCH_ASSOC),
            'age_groups' => $ageGroupsStmt->fetchAll(PDO::FETCH_ASSOC),
            'education' => $educationStmt->fetchAll(PDO::FETCH_ASSOC),
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
