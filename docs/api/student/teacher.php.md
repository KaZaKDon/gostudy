<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'student') {
    errorResponse('Анкета преподавателя доступна только ученику', 403);
}

$teacherId = (int) ($_GET['teacher_id'] ?? 0);

if ($teacherId <= 0) {
    errorResponse('Не указан преподаватель');
}

try {
    $pdo = getDatabaseConnection();

    $profileStmt = $pdo->prepare("
        SELECT
            tp.user_id AS teacher_id,
            tp.first_name,
            tp.last_name,
            tp.slug,
            tp.photo_url,
            tp.city,
            tp.headline,
            tp.experience_years,
            tp.about,
            tp.teaching_method,
            tp.first_lesson_description,
            tp.student_gets,
            tp.price_45,
            tp.price_60,
            tp.price_90,
            tp.pricing_comment,
            tp.trial_lesson_enabled,
            tp.schedule_description,
            tp.accessibility_enabled,
            tp.accessibility_comment,
            tp.intro_video_url,
            tp.is_verified,
            tp.rating,
            tp.reviews_count
        FROM teacher_profiles tp
        INNER JOIN users u
            ON u.id = tp.user_id
        WHERE tp.user_id = :teacher_id
          AND u.role = 'teacher'
          AND u.status = 'active'
          AND tp.is_visible = 1
          AND tp.verification_status = 'approved'
        LIMIT 1
    ");

    $profileStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $profile = $profileStmt->fetch(PDO::FETCH_ASSOC);

    if (!$profile) {
        errorResponse('Преподаватель не найден', 404);
    }

    $subjectsStmt = $pdo->prepare("
        SELECT
            s.id,
            s.name,
            s.slug
        FROM teacher_subjects ts
        INNER JOIN subjects s
            ON s.id = ts.subject_id
        WHERE ts.teacher_id = :teacher_id
          AND s.is_active = 1
        ORDER BY s.sort_order ASC, s.name ASC
    ");

    $subjectsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $subjects = $subjectsStmt->fetchAll(PDO::FETCH_ASSOC);

    $preparationsStmt = $pdo->prepare("
        SELECT
            tsp.subject_id,
            p.id,
            p.name,
            p.slug
        FROM teacher_subject_preparations tsp
        INNER JOIN preparations p
            ON p.id = tsp.preparation_id
        WHERE tsp.teacher_id = :teacher_id
          AND p.is_active = 1
        ORDER BY p.sort_order ASC, p.name ASC
    ");

    $preparationsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $preparationsBySubject = [];

    foreach ($preparationsStmt->fetchAll(PDO::FETCH_ASSOC) as $preparation) {
        $subjectId = (int) $preparation['subject_id'];
        $preparationsBySubject[$subjectId][] = [
            'id' => (int) $preparation['id'],
            'name' => $preparation['name'],
            'slug' => $preparation['slug'],
        ];
    }

    $subjects = array_map(
        static function (array $subject) use ($preparationsBySubject): array {
            $subjectId = (int) $subject['id'];

            return [
                'id' => $subjectId,
                'name' => $subject['name'],
                'slug' => $subject['slug'],
                'preparations' => $preparationsBySubject[$subjectId] ?? [],
            ];
        },
        $subjects
    );

    $ageGroupsStmt = $pdo->prepare("
        SELECT
            sag.id,
            sag.name,
            sag.slug
        FROM teacher_age_groups tag
        INNER JOIN student_age_groups sag
            ON sag.id = tag.age_group_id
        WHERE tag.teacher_id = :teacher_id
          AND sag.is_active = 1
        ORDER BY sag.sort_order ASC, sag.name ASC
    ");

    $ageGroupsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $educationStmt = $pdo->prepare("
        SELECT
            institution,
            faculty,
            speciality,
            qualification,
            graduation_year,
            description,
            is_primary
        FROM teacher_education
        WHERE teacher_id = :teacher_id
        ORDER BY is_primary DESC, sort_order ASC, id ASC
    ");

    $educationStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $documentsStmt = $pdo->prepare("
        SELECT
            type,
            document_title,
            institution,
            document_year
        FROM teacher_documents
        WHERE teacher_id = :teacher_id
          AND status = 'approved'
        ORDER BY sort_order ASC, id ASC
    ");

    $documentsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $reviewsStmt = $pdo->prepare("
        SELECT
            r.published_rating AS rating,
            r.published_text AS text,
            r.published_at AS created_at,
            r.teacher_reply,
            u.full_name AS student_name
        FROM reviews r
        INNER JOIN users u
            ON u.id = r.student_id
        WHERE r.teacher_id = :teacher_id
          AND r.published_at IS NOT NULL
          AND r.published_rating IS NOT NULL
        ORDER BY r.published_at DESC
        LIMIT 10
    ");

    $reviewsStmt->execute([
        'teacher_id' => $teacherId,
    ]);

    $pendingStmt = $pdo->prepare("
        SELECT subject_id
        FROM teacher_student_requests
        WHERE student_id = :student_id
          AND teacher_id = :teacher_id
          AND status = 'pending'
    ");

    $pendingStmt->execute([
        'student_id' => $user['id'],
        'teacher_id' => $teacherId,
    ]);

    $activeStmt = $pdo->prepare("
        SELECT subject_id
        FROM teacher_students
        WHERE student_id = :student_id
          AND teacher_id = :teacher_id
          AND status = 'active'
    ");

    $activeStmt->execute([
        'student_id' => $user['id'],
        'teacher_id' => $teacherId,
    ]);

    $formats = [];

    foreach ([45, 60, 90] as $duration) {
        $price = $profile['price_' . $duration];

        if ($price !== null && (float) $price > 0) {
            $formats[] = [
                'duration' => $duration,
                'price' => (float) $price,
            ];
        }
    }

    successResponse([
        'teacher' => [
            'teacher_id' => (int) $profile['teacher_id'],
            'first_name' => $profile['first_name'],
            'last_name' => $profile['last_name'],
            'name' => trim($profile['first_name'] . ' ' . $profile['last_name']),
            'slug' => $profile['slug'],
            'photo_url' => $profile['photo_url'],
            'city' => $profile['city'],
            'headline' => $profile['headline'],
            'experience_years' => $profile['experience_years'] !== null
                ? (int) $profile['experience_years']
                : null,
            'about' => $profile['about'],
            'teaching_method' => $profile['teaching_method'],
            'first_lesson_description' => $profile['first_lesson_description'],
            'student_gets' => $profile['student_gets'],
            'pricing_comment' => $profile['pricing_comment'],
            'trial_lesson_enabled' => (bool) $profile['trial_lesson_enabled'],
            'schedule_description' => $profile['schedule_description'],
            'accessibility_enabled' => (bool) $profile['accessibility_enabled'],
            'accessibility_comment' => $profile['accessibility_comment'],
            'intro_video_url' => $profile['intro_video_url'],
            'is_verified' => (bool) $profile['is_verified'],
            'rating' => (float) $profile['rating'],
            'reviews_count' => (int) $profile['reviews_count'],
            'subjects' => $subjects,
            'age_groups' => $ageGroupsStmt->fetchAll(PDO::FETCH_ASSOC),
            'formats' => $formats,
            'education' => $educationStmt->fetchAll(PDO::FETCH_ASSOC),
            'documents' => $documentsStmt->fetchAll(PDO::FETCH_ASSOC),
            'reviews' => $reviewsStmt->fetchAll(PDO::FETCH_ASSOC),
            'pending_subject_ids' => array_map(
                'intval',
                $pendingStmt->fetchAll(PDO::FETCH_COLUMN)
            ),
            'active_subject_ids' => array_map(
                'intval',
                $activeStmt->fetchAll(PDO::FETCH_COLUMN)
            ),
        ],
    ]);
} catch (Throwable $error) {
    error_log('student/teacher.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить анкету преподавателя', 500);
}
