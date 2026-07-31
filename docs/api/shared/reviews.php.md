<?php

declare(strict_types=1);

const REVIEW_STATUS_PENDING = 'pending';
const REVIEW_STATUS_APPROVED = 'approved';
const REVIEW_STATUS_REJECTED = 'rejected';

const REVIEW_REPLY_NONE = 'none';
const REVIEW_REPLY_PENDING = 'pending';
const REVIEW_REPLY_APPROVED = 'approved';
const REVIEW_REPLY_REJECTED = 'rejected';

function reviewParsePositiveId(mixed $value, string $label): int
{
    $id = filter_var(
        $value,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($id === false) {
        throw new InvalidArgumentException(
            'Не указан корректный ' . $label
        );
    }

    return (int) $id;
}

function reviewRecalculateTeacherSummary(PDO $pdo, int $teacherId): void
{
    $summaryStmt = $pdo->prepare("
        SELECT
            ROUND(AVG(published_rating), 2) AS rating,
            COUNT(*) AS reviews_count
        FROM reviews
        WHERE teacher_id = :teacher_id
          AND published_at IS NOT NULL
          AND published_rating IS NOT NULL
    ");
    $summaryStmt->execute([
        'teacher_id' => $teacherId,
    ]);
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $updateStmt = $pdo->prepare("
        UPDATE teacher_profiles
        SET
            rating = :rating,
            reviews_count = :reviews_count,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = :teacher_id
    ");
    $updateStmt->execute([
        'rating' => (float) ($summary['rating'] ?? 0),
        'reviews_count' => (int) ($summary['reviews_count'] ?? 0),
        'teacher_id' => $teacherId,
    ]);
}

function reviewFindRelation(
    PDO $pdo,
    int $relationId,
    int $studentId,
    bool $forUpdate = false
): ?array {
    $lockSql = $forUpdate ? ' FOR UPDATE' : '';
    $stmt = $pdo->prepare("
        SELECT
            ts.id,
            ts.teacher_id,
            ts.student_id,
            ts.subject_id,
            ts.status,
            teachers.full_name AS teacher_name,
            students.full_name AS student_name,
            subjects.name AS subject_name,
            (
                SELECT COUNT(*)
                FROM lessons completed_lessons
                WHERE completed_lessons.teacher_id = ts.teacher_id
                  AND completed_lessons.student_id = ts.student_id
                  AND completed_lessons.subject_id = ts.subject_id
                  AND completed_lessons.status = 'completed'
            ) AS completed_lessons_count
        FROM teacher_students ts
        INNER JOIN users teachers
            ON teachers.id = ts.teacher_id
           AND teachers.role = 'teacher'
        INNER JOIN users students
            ON students.id = ts.student_id
           AND students.role = 'student'
        INNER JOIN subjects
            ON subjects.id = ts.subject_id
        WHERE ts.id = :relation_id
          AND ts.student_id = :student_id
          AND ts.status IN ('active', 'archived')
        LIMIT 1{$lockSql}
    ");
    $stmt->execute([
        'relation_id' => $relationId,
        'student_id' => $studentId,
    ]);

    $relation = $stmt->fetch(PDO::FETCH_ASSOC);

    return $relation ?: null;
}

function reviewStudentResponse(?array $review): ?array
{
    if (!$review || empty($review['review_id'])) {
        return null;
    }

    return [
        'id' => (int) $review['review_id'],
        'rating' => (int) $review['rating'],
        'text' => $review['text'],
        'status' => $review['status'],
        'rejection_reason' => $review['rejection_reason'],
        'published_rating' => $review['published_rating'] !== null
            ? (int) $review['published_rating']
            : null,
        'published_text' => $review['published_text'],
        'published_at' => $review['published_at'],
        'teacher_reply' => $review['teacher_reply'],
        'reply_status' => $review['reply_status'],
        'updated_at' => $review['review_updated_at'],
    ];
}
