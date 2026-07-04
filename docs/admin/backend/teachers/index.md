<?php

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];

try {
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = (int) ($_GET['limit'] ?? 20);

    if ($limit < 1) {
        $limit = 20;
    }

    if ($limit > 100) {
        $limit = 100;
    }

    $offset = ($page - 1) * $limit;

    $q = trim($_GET['q'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $verificationStatus = trim($_GET['verification_status'] ?? '');
    $isVisible = trim($_GET['is_visible'] ?? '');

    $where = [
        "u.role = 'teacher'",
    ];

    $params = [];

    if ($q !== '') {
        $where[] = "(
            u.full_name LIKE :q
            OR u.email LIKE :q
            OR u.phone LIKE :q
            OR tp.city LIKE :q
            OR tp.headline LIKE :q
            OR CAST(u.id AS CHAR) LIKE :q
        )";

        $params['q'] = '%' . $q . '%';
    }

    if ($status !== '') {
        $where[] = 'u.status = :status';
        $params['status'] = $status;
    }

    if ($verificationStatus !== '') {
        $where[] = 'tp.verification_status = :verification_status';
        $params['verification_status'] = $verificationStatus;
    }

    if ($isVisible !== '') {
        $where[] = 'tp.is_visible = :is_visible';
        $params['is_visible'] = (int) $isVisible;
    }

    $whereSql = 'WHERE ' . implode(' AND ', $where);

    $countStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM users u
        LEFT JOIN teacher_profiles tp
            ON tp.user_id = u.id
        {$whereSql}
    ");

    foreach ($params as $key => $value) {
        if ($key === 'is_visible') {
            $countStmt->bindValue(':' . $key, (int) $value, PDO::PARAM_INT);
        } else {
            $countStmt->bindValue(':' . $key, $value);
        }
    }

    $countStmt->execute();
    $total = (int) $countStmt->fetchColumn();

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
            tp.city,
            tp.headline,
            tp.experience_years,
            tp.price_45,
            tp.price_60,
            tp.price_90,
            tp.price_per_lesson,
            tp.price_per_hour,
            tp.is_verified,
            tp.is_visible,
            tp.rating,
            tp.reviews_count,
            tp.verification_status,
            tp.verification_comment,
            tp.verified_at,
            tp.profile_completion,

            (
                SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
                FROM teacher_subjects teacher_subjects_list
                INNER JOIN subjects s
                    ON s.id = teacher_subjects_list.subject_id
                WHERE teacher_subjects_list.teacher_id = u.id
            ) AS subjects_text,

            (
                SELECT COUNT(*)
                FROM teacher_documents td
                WHERE td.teacher_id = u.id
            ) AS documents_total,

            (
                SELECT COUNT(*)
                FROM teacher_documents td
                WHERE td.teacher_id = u.id
                    AND td.status = 'pending'
            ) AS pending_documents_total,

            (
                SELECT COUNT(*)
                FROM teacher_students teacher_students_list
                WHERE teacher_students_list.teacher_id = u.id
                    AND teacher_students_list.status = 'active'
            ) AS active_students_total

        FROM users u
        LEFT JOIN teacher_profiles tp
            ON tp.user_id = u.id

        {$whereSql}

        ORDER BY u.created_at DESC

        LIMIT :limit OFFSET :offset
    ");

    foreach ($params as $key => $value) {
        if ($key === 'is_visible') {
            $stmt->bindValue(':' . $key, (int) $value, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':' . $key, $value);
        }
    }

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();

    adminJsonResponse([
        'success' => true,
        'data' => [
            'items' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int) ceil($total / $limit),
            ],
        ],
    ]);
} catch (Throwable $error) {
    adminJsonResponse([
        'success' => false,
        'message' => 'Ошибка получения списка преподавателей',
        'error' => $error->getMessage(),
    ], 500);
}