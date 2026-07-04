# dashboard/stats.php

Получение статистики Dashboard.

<?php

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Vary: Origin');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();

$pdo = $auth['pdo'];

try {
    $stats = [];

    $stats['users_total'] = (int) $pdo
        ->query("SELECT COUNT(*) FROM users")
        ->fetchColumn();

    $stats['students_total'] = (int) $pdo
        ->query("SELECT COUNT(*) FROM users WHERE role = 'student'")
        ->fetchColumn();

    $stats['teachers_total'] = (int) $pdo
        ->query("SELECT COUNT(*) FROM users WHERE role = 'teacher'")
        ->fetchColumn();

    $stats['admins_total'] = (int) $pdo
        ->query("SELECT COUNT(*) FROM users WHERE role IN ('admin', 'moderator')")
        ->fetchColumn();

    $stats['blocked_users_total'] = (int) $pdo
        ->query("SELECT COUNT(*) FROM users WHERE status <> 'active'")
        ->fetchColumn();

    $stats['teachers_new_total'] = (int) $pdo
        ->query("
            SELECT COUNT(*)
            FROM teacher_profiles
            WHERE verification_status IN ('new', 'pending')
        ")
        ->fetchColumn();

    $stats['requests_pending_total'] = (int) $pdo
        ->query("
            SELECT COUNT(*)
            FROM teacher_student_requests
            WHERE status = 'pending'
        ")
        ->fetchColumn();

    $stats['lessons_planned_total'] = (int) $pdo
        ->query("
            SELECT COUNT(*)
            FROM lessons
            WHERE status = 'planned'
        ")
        ->fetchColumn();

    $stats['homework_assigned_total'] = (int) $pdo
        ->query("
            SELECT COUNT(*)
            FROM homework
            WHERE status = 'assigned'
        ")
        ->fetchColumn();

    $stats['messages_total'] = (int) $pdo
        ->query("SELECT COUNT(*) FROM messages")
        ->fetchColumn();

    $stats['reports_new_total'] = (int) $pdo
        ->query("
            SELECT COUNT(*)
            FROM reports
            WHERE status = 'new'
        ")
        ->fetchColumn();

    $stats['reviews_pending_total'] = (int) $pdo
        ->query("
            SELECT COUNT(*)
            FROM reviews
            WHERE status = 'pending'
        ")
        ->fetchColumn();

    $stats['payments_paid_total'] = (int) $pdo
        ->query("
            SELECT COUNT(*)
            FROM payments
            WHERE status = 'paid'
        ")
        ->fetchColumn();

    $stats['payouts_pending_total'] = (int) $pdo
        ->query("
            SELECT COUNT(*)
            FROM payouts
            WHERE status = 'pending'
        ")
        ->fetchColumn();

    adminJsonResponse([
        'success' => true,
        'data' => $stats,
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка получения статистики админки',
        'error' => $error->getMessage(),
    ], 500);
}
