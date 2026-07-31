<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/reviews.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if (!in_array($user['role'], ['student', 'teacher'], true)) {
    errorResponse('Раздел отзывов недоступен', 403);
}

try {
    $pdo = getDatabaseConnection();

    if ($user['role'] === 'student') {
        $stmt = $pdo->prepare("
            SELECT
                ts.id AS relation_id,
                ts.teacher_id,
                ts.subject_id,
                ts.status AS relation_status,
                ts.started_at,
                teachers.full_name AS teacher_name,
                subjects.name AS subject_name,
                tp.photo_url AS teacher_photo_url,
                (
                    SELECT COUNT(*)
                    FROM lessons completed_lessons
                    WHERE completed_lessons.teacher_id = ts.teacher_id
                      AND completed_lessons.student_id = ts.student_id
                      AND completed_lessons.subject_id = ts.subject_id
                      AND completed_lessons.status = 'completed'
                ) AS completed_lessons_count,
                r.id AS review_id,
                r.rating,
                r.text,
                r.status,
                r.rejection_reason,
                r.published_rating,
                r.published_text,
                r.published_at,
                r.teacher_reply,
                r.reply_status,
                r.updated_at AS review_updated_at
            FROM teacher_students ts
            INNER JOIN users teachers
                ON teachers.id = ts.teacher_id
               AND teachers.role = 'teacher'
            INNER JOIN subjects
                ON subjects.id = ts.subject_id
            LEFT JOIN teacher_profiles tp
                ON tp.user_id = ts.teacher_id
            LEFT JOIN reviews r
                ON r.teacher_student_id = ts.id
            WHERE ts.student_id = :student_id
              AND ts.status IN ('active', 'archived')
            ORDER BY
                FIELD(ts.status, 'active', 'archived'),
                teachers.full_name,
                subjects.name
        ");
        $stmt->execute([
            'student_id' => (int) $user['id'],
        ]);

        $relations = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $relations[] = [
                'relation_id' => (int) $row['relation_id'],
                'teacher_id' => (int) $row['teacher_id'],
                'teacher_name' => $row['teacher_name'],
                'teacher_photo_url' => $row['teacher_photo_url'],
                'subject_id' => (int) $row['subject_id'],
                'subject_name' => $row['subject_name'],
                'relation_status' => $row['relation_status'],
                'started_at' => $row['started_at'],
                'completed_lessons_count' =>
                    (int) $row['completed_lessons_count'],
                'can_review' =>
                    (int) $row['completed_lessons_count'] > 0,
                'review' => reviewStudentResponse($row),
            ];
        }

        successResponse([
            'relations' => $relations,
        ]);
    }

    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $countStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM reviews
        WHERE teacher_id = :teacher_id
          AND published_at IS NOT NULL
          AND published_rating IS NOT NULL
    ");
    $countStmt->execute([
        'teacher_id' => (int) $user['id'],
    ]);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.student_id,
            r.subject_id,
            r.published_rating AS rating,
            r.published_text AS text,
            r.published_at,
            r.teacher_reply,
            r.pending_teacher_reply,
            r.reply_status,
            r.reply_rejection_reason,
            students.full_name AS student_name,
            subjects.name AS subject_name
        FROM reviews r
        INNER JOIN users students
            ON students.id = r.student_id
        LEFT JOIN subjects
            ON subjects.id = r.subject_id
        WHERE r.teacher_id = :teacher_id
          AND r.published_at IS NOT NULL
          AND r.published_rating IS NOT NULL
        ORDER BY r.published_at DESC, r.id DESC
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindValue(':teacher_id', (int) $user['id'], PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $summaryStmt = $pdo->prepare("
        SELECT rating, reviews_count
        FROM teacher_profiles
        WHERE user_id = :teacher_id
        LIMIT 1
    ");
    $summaryStmt->execute([
        'teacher_id' => (int) $user['id'],
    ]);
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $items = array_map(
        static fn(array $row): array => [
            'id' => (int) $row['id'],
            'student_id' => (int) $row['student_id'],
            'student_name' => $row['student_name'],
            'subject_id' => $row['subject_id'] !== null
                ? (int) $row['subject_id']
                : null,
            'subject_name' => $row['subject_name'] ?: 'Предмет',
            'rating' => (int) $row['rating'],
            'text' => $row['text'],
            'published_at' => $row['published_at'],
            'teacher_reply' => $row['teacher_reply'],
            'pending_teacher_reply' => $row['pending_teacher_reply'],
            'reply_status' => $row['reply_status'],
            'reply_rejection_reason' => $row['reply_rejection_reason'],
        ],
        $stmt->fetchAll(PDO::FETCH_ASSOC)
    );

    successResponse([
        'items' => $items,
        'summary' => [
            'rating' => (float) ($summary['rating'] ?? 0),
            'reviews_count' => (int) ($summary['reviews_count'] ?? 0),
        ],
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => (int) ceil($total / $limit),
        ],
    ]);
} catch (Throwable $error) {
    error_log('reviews/index.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить отзывы', 500);
}
