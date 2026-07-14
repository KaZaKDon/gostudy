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
    errorResponse('Раздел доступен только ученику', 403);
}

try {
    $pdo = getDatabaseConnection();

    function loadTeachers(PDO $pdo, int $studentId, string $status): array
    {
        $stmt = $pdo->prepare("
            SELECT
                ts.id,
                u.id AS teacher_id,
                u.full_name AS teacher_name,
                s.name AS subject,
                tp.headline,
                tp.city,
                tp.experience_years,
                ts.started_at,
                ts.status

            FROM teacher_students ts

            INNER JOIN users u
                ON u.id = ts.teacher_id

            LEFT JOIN teacher_profiles tp
                ON tp.user_id = ts.teacher_id

            LEFT JOIN subjects s
                ON s.id = ts.subject_id

            WHERE
                ts.student_id = :student_id
                AND ts.status = :status

            ORDER BY
                ts.started_at DESC
        ");

        $stmt->execute([
            'student_id' => $studentId,
            'status' => $status,
        ]);

        return $stmt->fetchAll();
    }

    function loadRequests(PDO $pdo, int $studentId): array
    {
        $stmt = $pdo->prepare("
            SELECT
                r.id,
                u.id AS teacher_id,
                u.full_name AS teacher_name,
                s.name AS subject,
                r.status,
                r.created_at

            FROM teacher_student_requests r

            INNER JOIN users u
                ON u.id = r.teacher_id

            LEFT JOIN subjects s
                ON s.id = r.subject_id

            WHERE
                r.student_id = :student_id
                AND r.status = 'pending'

            ORDER BY
                r.created_at DESC
        ");

        $stmt->execute([
            'student_id' => $studentId,
        ]);

        return $stmt->fetchAll();
    }

    successResponse([
        'teachers' => [
            'active' => loadTeachers($pdo, (int)$user['id'], 'active'),
            'archive' => loadTeachers($pdo, (int)$user['id'], 'archived'),
            'requests' => loadRequests($pdo, (int)$user['id']),
        ],
    ]);

} catch (Throwable $e) {
    errorResponse('Не удалось загрузить преподавателей', 500);
}