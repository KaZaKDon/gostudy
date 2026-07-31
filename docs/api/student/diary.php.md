<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/lesson-management.php';
require_once __DIR__ . '/../shared/journal.php';
require_once __DIR__ . '/../shared/notifications.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'student') {
    errorResponse('Дневник доступен только ученику', 403);
}

try {
    $subjectId = journalParseOptionalPositiveId(
        $_GET['subject_id'] ?? null,
        'предмет'
    );
    $targetLessonId = journalParseOptionalPositiveId(
        $_GET['lesson_id'] ?? null,
        'урок'
    );
    $limit = journalParseLimit($_GET['limit'] ?? null);
    $cursor = journalParseCursor(
        $_GET['before_date'] ?? null,
        $_GET['before_id'] ?? null
    );
    $pdo = getDatabaseConnection();
    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);
    $subjectsStmt = $pdo->prepare("
        SELECT
            l.subject_id AS id,
            subjects.name,
            COUNT(*) AS lessons_count,
            SUM(lr.attendance IN ('present', 'late')) AS attended_count,
            AVG(
                CASE
                    WHEN lr.grade IN ('2', '3', '4', '5')
                    THEN CAST(lr.grade AS DECIMAL(4, 2))
                    ELSE NULL
                END
            ) AS average_grade
        FROM lessons l
        INNER JOIN subjects
            ON subjects.id = l.subject_id
        INNER JOIN lesson_results lr
            ON lr.lesson_id = l.id
           AND lr.published_at IS NOT NULL
        WHERE l.student_id = :student_id
          AND l.status = 'completed'
        GROUP BY l.subject_id, subjects.name
        ORDER BY subjects.name ASC
    ");
    $subjectsStmt->execute([
        'student_id' => (int) $user['id'],
    ]);
    $subjects = $subjectsStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($subjects as &$subject) {
        $subject['id'] = (int) $subject['id'];
        $subject['lessons_count'] = (int) $subject['lessons_count'];
        $subject['attended_count'] = (int) $subject['attended_count'];
        $subject['average_grade'] = $subject['average_grade'] !== null
            ? number_format((float) $subject['average_grade'], 1, '.', '')
            : null;
    }
    unset($subject);

    $targetLesson = null;

    if ($targetLessonId !== null) {
        $targetStmt = $pdo->prepare(journalLessonSelect() . "
            WHERE l.id = :lesson_id
              AND l.student_id = :student_id
              AND l.status = 'completed'
              AND lr.published_at IS NOT NULL
            LIMIT 1
        ");
        $targetStmt->execute([
            'lesson_id' => $targetLessonId,
            'student_id' => (int) $user['id'],
        ]);
        $targetRow = $targetStmt->fetch(PDO::FETCH_ASSOC);

        if (!$targetRow) {
            errorResponse('Запись дневника не найдена', 404);
        }

        $subjectId = (int) $targetRow['subject_id'];
        $targetLesson = journalNormalizeLesson(
            $targetRow,
            $viewerTimezone,
            false
        );
        notificationMarkEntityRead(
            $pdo,
            (int) $user['id'],
            'lesson',
            $targetLessonId
        );
    }

    if ($subjectId === null && $subjects) {
        $subjectId = $subjects[0]['id'];
    }

    $activeSubject = null;

    foreach ($subjects as $subject) {
        if ($subject['id'] === $subjectId) {
            $activeSubject = $subject;
            break;
        }
    }

    if ($subjectId !== null && !$activeSubject) {
        errorResponse('Записи выбранного предмета не найдены', 404);
    }

    $lessons = [];
    $hasMore = false;
    $nextBeforeDate = null;
    $nextBeforeId = null;

    if ($activeSubject) {
        $cursorSql = $cursor === null
            ? ''
            : "AND (
                l.lesson_date < :before_date
                OR (
                    l.lesson_date = :before_date_equal
                    AND l.id < :before_id
                )
            )";
        $lessonsStmt = $pdo->prepare(journalLessonSelect() . "
            WHERE l.student_id = :student_id
              AND l.subject_id = :subject_id
              AND l.status = 'completed'
              AND lr.published_at IS NOT NULL
              {$cursorSql}
            ORDER BY l.lesson_date DESC, l.id DESC
            LIMIT :result_limit
        ");
        $lessonsStmt->bindValue(':student_id', (int) $user['id'], PDO::PARAM_INT);
        $lessonsStmt->bindValue(':subject_id', $subjectId, PDO::PARAM_INT);

        if ($cursor !== null) {
            $lessonsStmt->bindValue(':before_date', $cursor['date']);
            $lessonsStmt->bindValue(':before_date_equal', $cursor['date']);
            $lessonsStmt->bindValue(':before_id', $cursor['id'], PDO::PARAM_INT);
        }

        $lessonsStmt->bindValue(':result_limit', $limit + 1, PDO::PARAM_INT);
        $lessonsStmt->execute();
        $lessonRows = $lessonsStmt->fetchAll(PDO::FETCH_ASSOC);
        $hasMore = count($lessonRows) > $limit;

        if ($hasMore) {
            array_pop($lessonRows);
        }

        if ($hasMore && $lessonRows) {
            $lastRow = end($lessonRows);
            $nextBeforeDate = $lastRow['lesson_date'];
            $nextBeforeId = (int) $lastRow['lesson_id'];
        }

        $lessons = array_map(
            static fn (array $row): array => journalNormalizeLesson(
                $row,
                $viewerTimezone,
                false
            ),
            $lessonRows
        );
    }

    $summaryStmt = $pdo->prepare("
        SELECT
            COUNT(*) AS lessons_count,
            SUM(lr.attendance IN ('present', 'late')) AS attended_count,
            AVG(
                CASE
                    WHEN lr.grade IN ('2', '3', '4', '5')
                    THEN CAST(lr.grade AS DECIMAL(4, 2))
                    ELSE NULL
                END
            ) AS average_grade
        FROM lessons l
        INNER JOIN lesson_results lr
            ON lr.lesson_id = l.id
           AND lr.published_at IS NOT NULL
        WHERE l.student_id = :student_id
          AND l.status = 'completed'
    ");
    $summaryStmt->execute([
        'student_id' => (int) $user['id'],
    ]);
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

    successResponse([
        'subjects' => $subjects,
        'active_subject' => $activeSubject,
        'lessons' => $lessons,
        'target_lesson' => $targetLesson,
        'summary' => [
            'lessons_count' => (int) ($summary['lessons_count'] ?? 0),
            'attended_count' => (int) ($summary['attended_count'] ?? 0),
            'average_grade' => ($summary['average_grade'] ?? null) !== null
                ? number_format((float) $summary['average_grade'], 1, '.', '')
                : null,
        ],
        'has_more' => $hasMore,
        'next_before_date' => $nextBeforeDate,
        'next_before_id' => $nextBeforeId,
        'timezone' => $viewerTimezone->getName(),
    ]);
} catch (InvalidArgumentException $error) {
    errorResponse($error->getMessage());
} catch (Throwable $error) {
    error_log('student/diary.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить дневник', 500);
}
