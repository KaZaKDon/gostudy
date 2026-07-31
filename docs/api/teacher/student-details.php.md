<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/homework.php';
require_once __DIR__ . '/../shared/lesson-time.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Карточка ученика доступна только преподавателю', 403);
}

$relationId = filter_var(
    $_GET['relation_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);
$tab = trim((string) ($_GET['tab'] ?? 'overview'));
$allowedTabs = [
    'overview',
    'lessons',
    'homework',
    'program',
    'materials',
    'payments',
    'parents',
    'feedback',
];

if ($relationId === false) {
    errorResponse('Не указан ученик');
}

if (!in_array($tab, $allowedTabs, true)) {
    errorResponse('Неизвестный раздел карточки ученика');
}

try {
    $pdo = getDatabaseConnection();
    $timezone = homeworkUserTimezone(
        $pdo,
        (int) $user['id'],
        'teacher'
    );

    $relationStmt = $pdo->prepare("
        SELECT
            ts.id,
            ts.teacher_id,
            ts.student_id,
            ts.subject_id,
            ts.status,
            ts.started_at,
            ts.archived_at,
            students.full_name AS student_name,
            students.email AS student_email,
            students.phone AS student_phone,
            subjects.name AS subject_name,
            sp.class_level,
            sp.goal,
            sp.learning_goals,
            sp.level_description,
            sp.lesson_format,
            sp.schedule_comment,
            sp.parent_name,
            sp.parent_phone,
            sp.parent_email
        FROM teacher_students ts
        INNER JOIN users students
            ON students.id = ts.student_id
           AND students.role = 'student'
        INNER JOIN subjects
            ON subjects.id = ts.subject_id
        LEFT JOIN student_profiles sp
            ON sp.user_id = ts.student_id
        WHERE ts.id = :relation_id
          AND ts.teacher_id = :teacher_id
          AND ts.status IN ('active', 'archived')
        LIMIT 1
    ");
    $relationStmt->execute([
        'relation_id' => (int) $relationId,
        'teacher_id' => (int) $user['id'],
    ]);
    $relation = $relationStmt->fetch(PDO::FETCH_ASSOC);

    if (!$relation) {
        errorResponse('Ученик не найден', 404);
    }

    $studentId = (int) $relation['student_id'];
    $subjectId = (int) $relation['subject_id'];
    $teacherId = (int) $user['id'];
    $data = [];

    if ($tab === 'overview') {
        $countsStmt = $pdo->prepare("
            SELECT
                COUNT(*) AS lessons_total,
                SUM(l.status = 'completed') AS lessons_completed,
                SUM(l.status IN ('scheduled', 'rescheduled')) AS lessons_planned,
                MIN(
                    CASE
                        WHEN l.status IN ('scheduled', 'rescheduled')
                         AND l.lesson_date >= CURRENT_TIMESTAMP
                        THEN l.lesson_date
                        ELSE NULL
                    END
                ) AS next_lesson_at
            FROM lessons l
            WHERE l.teacher_id = :teacher_id
              AND l.student_id = :student_id
              AND l.subject_id = :subject_id
        ");
        $countsStmt->execute([
            'teacher_id' => $teacherId,
            'student_id' => $studentId,
            'subject_id' => $subjectId,
        ]);
        $counts = $countsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $homeworkStmt = $pdo->prepare("
            SELECT
                COUNT(*) AS homework_total,
                SUM(h.status = 'completed') AS homework_completed
            FROM homework h
            WHERE h.teacher_id = :teacher_id
              AND h.student_id = :student_id
              AND h.subject_id = :subject_id
              AND h.status <> 'cancelled'
        ");
        $homeworkStmt->execute([
            'teacher_id' => $teacherId,
            'student_id' => $studentId,
            'subject_id' => $subjectId,
        ]);
        $homeworkCounts = $homeworkStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $notesStmt = $pdo->prepare("
            SELECT
                lr.teacher_note,
                l.lesson_date
            FROM lesson_results lr
            INNER JOIN lessons l
                ON l.id = lr.lesson_id
            WHERE l.teacher_id = :teacher_id
              AND l.student_id = :student_id
              AND l.subject_id = :subject_id
              AND NULLIF(TRIM(lr.teacher_note), '') IS NOT NULL
            ORDER BY l.lesson_date DESC, l.id DESC
            LIMIT 10
        ");
        $notesStmt->execute([
            'teacher_id' => $teacherId,
            'student_id' => $studentId,
            'subject_id' => $subjectId,
        ]);

        $notes = array_map(
            static fn (array $note): array => [
                'text' => (string) $note['teacher_note'],
                'lesson_date' => lessonFromStorageDateTime(
                    $note['lesson_date'],
                    $timezone
                ),
            ],
            $notesStmt->fetchAll(PDO::FETCH_ASSOC)
        );

        $data = [
            'next_lesson_at' => lessonFromStorageDateTime(
                $counts['next_lesson_at'] ?? null,
                $timezone
            ),
            'lessons_total' => (int) ($counts['lessons_total'] ?? 0),
            'lessons_completed' => (int) ($counts['lessons_completed'] ?? 0),
            'lessons_planned' => (int) ($counts['lessons_planned'] ?? 0),
            'homework_total' => (int) ($homeworkCounts['homework_total'] ?? 0),
            'homework_completed' =>
                (int) ($homeworkCounts['homework_completed'] ?? 0),
            'notes' => $notes,
        ];
    } elseif ($tab === 'lessons') {
        $stmt = $pdo->prepare("
            SELECT
                l.id,
                l.lesson_date,
                l.duration_minutes,
                l.status,
                l.lesson_topic,
                l.title,
                lr.attendance,
                lr.grade,
                lr.lesson_result,
                lr.teacher_comment,
                lr.published_at,
                (
                    SELECT h.title
                    FROM homework h
                    WHERE h.lesson_id = l.id
                      AND h.status <> 'cancelled'
                    ORDER BY h.id DESC
                    LIMIT 1
                ) AS homework_title
            FROM lessons l
            LEFT JOIN lesson_results lr
                ON lr.lesson_id = l.id
            WHERE l.teacher_id = :teacher_id
              AND l.student_id = :student_id
              AND l.subject_id = :subject_id
            ORDER BY l.lesson_date DESC, l.id DESC
            LIMIT 100
        ");
        $stmt->execute([
            'teacher_id' => $teacherId,
            'student_id' => $studentId,
            'subject_id' => $subjectId,
        ]);

        $data = [
            'items' => array_map(
                static fn (array $lesson): array => [
                    'id' => (int) $lesson['id'],
                    'lesson_date' => lessonFromStorageDateTime(
                        $lesson['lesson_date'],
                        $timezone
                    ),
                    'duration_minutes' => (int) $lesson['duration_minutes'],
                    'status' => (string) $lesson['status'],
                    'topic' => trim((string) ($lesson['lesson_topic'] ?? ''))
                        ?: (string) $lesson['title'],
                    'attendance' => $lesson['attendance'],
                    'grade' => $lesson['grade'],
                    'result' => $lesson['published_at'] !== null
                        ? $lesson['lesson_result']
                        : null,
                    'teacher_comment' => $lesson['published_at'] !== null
                        ? $lesson['teacher_comment']
                        : null,
                    'homework_title' => $lesson['homework_title'],
                ],
                $stmt->fetchAll(PDO::FETCH_ASSOC)
            ),
        ];
    } elseif ($tab === 'homework') {
        $stmt = $pdo->prepare(homeworkBaseSelect() . "
            WHERE h.teacher_id = :teacher_id
              AND h.student_id = :student_id
              AND h.subject_id = :subject_id
              AND h.status <> 'cancelled'
            ORDER BY h.created_at DESC, h.id DESC
            LIMIT 100
        ");
        $stmt->execute([
            'teacher_id' => $teacherId,
            'student_id' => $studentId,
            'subject_id' => $subjectId,
        ]);

        $data = [
            'items' => array_map(
                static fn (array $homework): array =>
                    homeworkNormalizeRow($homework, $timezone),
                $stmt->fetchAll(PDO::FETCH_ASSOC)
            ),
        ];
    } elseif ($tab === 'program') {
        $data = [
            'items' => [],
            'learning_goals' => $relation['learning_goals']
                ?: $relation['goal'],
            'empty_message' =>
                'Рабочая программа для ученика ещё не создана.',
        ];
    } elseif ($tab === 'materials') {
        $stmt = $pdo->prepare("
            SELECT *
            FROM (
                SELECT
                    'lesson' AS source_type,
                    lf.id AS file_id,
                    lf.original_name,
                    lf.mime_type,
                    lf.file_size,
                    lf.created_at,
                    l.id AS source_id,
                    COALESCE(NULLIF(l.lesson_topic, ''), l.title) AS source_title
                FROM lesson_files lf
                INNER JOIN lessons l
                    ON l.id = lf.lesson_id
                WHERE l.teacher_id = :lesson_teacher_id
                  AND l.student_id = :lesson_student_id
                  AND l.subject_id = :lesson_subject_id

                UNION ALL

                SELECT
                    'homework' AS source_type,
                    ha.id AS file_id,
                    ha.original_name,
                    ha.mime_type,
                    ha.file_size,
                    ha.created_at,
                    h.id AS source_id,
                    h.title AS source_title
                FROM homework_attachments ha
                INNER JOIN homework h
                    ON h.id = ha.homework_id
                WHERE h.teacher_id = :homework_teacher_id
                  AND h.student_id = :homework_student_id
                  AND h.subject_id = :homework_subject_id
                  AND h.status <> 'cancelled'
            ) student_materials
            ORDER BY created_at DESC, file_id DESC
            LIMIT 100
        ");
        $stmt->execute([
            'lesson_teacher_id' => $teacherId,
            'lesson_student_id' => $studentId,
            'lesson_subject_id' => $subjectId,
            'homework_teacher_id' => $teacherId,
            'homework_student_id' => $studentId,
            'homework_subject_id' => $subjectId,
        ]);

        $data = [
            'items' => array_map(
                static fn (array $material): array => [
                    'id' => $material['source_type']
                        . '-' . $material['file_id'],
                    'source_type' => $material['source_type'],
                    'file_id' => (int) $material['file_id'],
                    'original_name' => (string) $material['original_name'],
                    'mime_type' => (string) $material['mime_type'],
                    'file_size' => (int) $material['file_size'],
                    'source_id' => (int) $material['source_id'],
                    'source_title' => (string) $material['source_title'],
                    'created_at' => lessonFromStorageDateTime(
                        $material['created_at'],
                        $timezone
                    ),
                ],
                $stmt->fetchAll(PDO::FETCH_ASSOC)
            ),
        ];
    } elseif ($tab === 'payments') {
        $data = [
            'items' => [],
            'empty_message' =>
                'Учёт оплат будет подключён после утверждения платёжной модели.',
        ];
    } elseif ($tab === 'parents') {
        $data = [
            'name' => $relation['parent_name'],
            'phone' => $relation['parent_phone'],
            'email' => $relation['parent_email'],
        ];
    } elseif ($tab === 'feedback') {
        $stmt = $pdo->prepare("
            SELECT
                r.id,
                r.published_rating,
                r.published_text,
                r.published_at,
                r.teacher_reply,
                students.full_name AS student_name
            FROM reviews r
            INNER JOIN users students
                ON students.id = r.student_id
            WHERE (
                    r.teacher_student_id = :relation_id
                    OR (
                        r.teacher_student_id IS NULL
                        AND r.student_id = :student_id
                        AND r.subject_id = :subject_id
                    )
                )
              AND r.teacher_id = :teacher_id
              AND r.published_at IS NOT NULL
              AND r.published_rating IS NOT NULL
            ORDER BY r.published_at DESC, r.id DESC
        ");
        $stmt->execute([
            'relation_id' => (int) $relationId,
            'student_id' => $studentId,
            'subject_id' => $subjectId,
            'teacher_id' => $teacherId,
        ]);

        $data = [
            'items' => array_map(
                static fn (array $review): array => [
                    'id' => (int) $review['id'],
                    'rating' => (int) $review['published_rating'],
                    'text' => (string) $review['published_text'],
                    'published_at' => $review['published_at'],
                    'student_name' => (string) $review['student_name'],
                    'teacher_reply' => $review['teacher_reply'],
                ],
                $stmt->fetchAll(PDO::FETCH_ASSOC)
            ),
        ];
    }

    successResponse([
        'relation' => [
            'id' => (int) $relation['id'],
            'student_id' => $studentId,
            'subject_id' => $subjectId,
            'status' => (string) $relation['status'],
            'student_name' => (string) $relation['student_name'],
            'subject_name' => (string) $relation['subject_name'],
        ],
        'tab' => $tab,
        'data' => $data,
    ]);
} catch (Throwable $error) {
    error_log('teacher/student-details.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить раздел карточки ученика', 500);
}
