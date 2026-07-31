<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/lesson-management.php';
require_once __DIR__ . '/../shared/journal.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Журнал доступен только преподавателю', 403);
}

try {
    $studentId = journalParseOptionalPositiveId(
        $_GET['student_id'] ?? null,
        'ученик'
    );
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

    if (($studentId === null) !== ($subjectId === null)) {
        errorResponse('Ученик и предмет должны быть выбраны вместе');
    }

    $pdo = getDatabaseConnection();
    $viewerTimezone = lessonGetViewerTimezone($pdo, $user);

    if ($targetLessonId !== null) {
        $targetCourseStmt = $pdo->prepare("
            SELECT student_id, subject_id
            FROM lessons
            WHERE id = :lesson_id
              AND teacher_id = :teacher_id
              AND status = 'completed'
            LIMIT 1
        ");
        $targetCourseStmt->execute([
            'lesson_id' => $targetLessonId,
            'teacher_id' => (int) $user['id'],
        ]);
        $targetCourse = $targetCourseStmt->fetch(PDO::FETCH_ASSOC);

        if (!$targetCourse) {
            errorResponse('Завершённый урок не найден', 404);
        }

        $studentId = (int) $targetCourse['student_id'];
        $subjectId = (int) $targetCourse['subject_id'];
    }

    $coursesStmt = $pdo->prepare("
        SELECT
            l.student_id,
            l.subject_id,
            students.full_name AS student_name,
            students.avatar_url AS student_avatar_url,
            subjects.name AS subject_name,
            sp.class_level,
            COUNT(*) AS lessons_count,
            SUM(lr.published_at IS NULL) AS pending_results_count
        FROM lessons l
        INNER JOIN users students
            ON students.id = l.student_id
           AND students.role = 'student'
        INNER JOIN subjects
            ON subjects.id = l.subject_id
        LEFT JOIN student_profiles sp
            ON sp.user_id = l.student_id
        LEFT JOIN lesson_results lr
            ON lr.lesson_id = l.id
        WHERE l.teacher_id = :teacher_id
          AND l.status IN ('scheduled', 'rescheduled', 'completed')
          AND (
              l.status = 'completed'
              OR DATE_ADD(
                  l.lesson_date,
                  INTERVAL l.duration_minutes MINUTE
              ) <= CURRENT_TIMESTAMP
          )
        GROUP BY
            l.student_id,
            l.subject_id,
            students.full_name,
            students.avatar_url,
            subjects.name,
            sp.class_level
        ORDER BY students.full_name ASC, subjects.name ASC
    ");
    $coursesStmt->execute([
        'teacher_id' => (int) $user['id'],
    ]);
    $courses = $coursesStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($courses as &$course) {
        $course['student_id'] = (int) $course['student_id'];
        $course['subject_id'] = (int) $course['subject_id'];
        $course['lessons_count'] = (int) $course['lessons_count'];
        $course['pending_results_count'] = (int) $course['pending_results_count'];
    }
    unset($course);

    if ($studentId === null && $courses) {
        $studentId = $courses[0]['student_id'];
        $subjectId = $courses[0]['subject_id'];
    }

    $activeCourse = null;

    foreach ($courses as $course) {
        if (
            $course['student_id'] === $studentId
            && $course['subject_id'] === $subjectId
        ) {
            $activeCourse = $course;
            break;
        }
    }

    if ($studentId !== null && !$activeCourse) {
        errorResponse('Записи выбранного ученика не найдены', 404);
    }

    $lessons = [];
    $targetLesson = null;
    $hasMore = false;
    $nextBeforeDate = null;
    $nextBeforeId = null;

    if ($activeCourse) {
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
            WHERE l.teacher_id = :teacher_id
              AND l.student_id = :student_id
              AND l.subject_id = :subject_id
              AND l.status IN ('scheduled', 'rescheduled', 'completed')
              AND (
                  l.status = 'completed'
                  OR DATE_ADD(
                      l.lesson_date,
                      INTERVAL l.duration_minutes MINUTE
                  ) <= CURRENT_TIMESTAMP
              )
              {$cursorSql}
            ORDER BY l.lesson_date DESC, l.id DESC
            LIMIT :result_limit
        ");
        $lessonsStmt->bindValue(':teacher_id', (int) $user['id'], PDO::PARAM_INT);
        $lessonsStmt->bindValue(':student_id', $studentId, PDO::PARAM_INT);
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
                true
            ),
            $lessonRows
        );

        if ($targetLessonId !== null) {
            $targetLessonStmt = $pdo->prepare(journalLessonSelect() . "
                WHERE l.id = :lesson_id
                  AND l.teacher_id = :teacher_id
                  AND l.status = 'completed'
                LIMIT 1
            ");
            $targetLessonStmt->execute([
                'lesson_id' => $targetLessonId,
                'teacher_id' => (int) $user['id'],
            ]);
            $targetLessonRow = $targetLessonStmt->fetch(PDO::FETCH_ASSOC);

            if ($targetLessonRow) {
                $targetLesson = journalNormalizeLesson(
                    $targetLessonRow,
                    $viewerTimezone,
                    true
                );
            }
        }
    }

    successResponse([
        'courses' => $courses,
        'active_course' => $activeCourse,
        'lessons' => $lessons,
        'target_lesson' => $targetLesson,
        'has_more' => $hasMore,
        'next_before_date' => $nextBeforeDate,
        'next_before_id' => $nextBeforeId,
        'timezone' => $viewerTimezone->getName(),
    ]);
} catch (InvalidArgumentException $error) {
    errorResponse($error->getMessage());
} catch (Throwable $error) {
    error_log('journal/index.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить журнал', 500);
}
