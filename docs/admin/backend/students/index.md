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

    $where = [
        "u.role = 'student'",
    ];

    $params = [];

    if ($q !== '') {
        $where[] = "(
            u.full_name LIKE :q
            OR u.email LIKE :q
            OR u.phone LIKE :q
            OR sp.parent_name LIKE :q
            OR sp.parent_phone LIKE :q
            OR CAST(u.id AS CHAR) LIKE :q
        )";

        $params['q'] = '%' . $q . '%';
    }

    if ($status !== '') {
        $where[] = "u.status = :status";
        $params['status'] = $status;
    }

    $whereSql = 'WHERE ' . implode(' AND ', $where);

    $countStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM users u
        LEFT JOIN student_profiles sp
            ON sp.user_id = u.id
        {$whereSql}
    ");

    foreach ($params as $key => $value) {
        $countStmt->bindValue(':' . $key, $value);
    }

    $countStmt->execute();
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.full_name,
            u.email,
            u.phone,
            u.status,
            u.last_login_at,
            u.created_at,
            u.updated_at,

            sp.birth_year,
            sp.class_level,
            sp.goal,
            sp.parent_name,
            sp.parent_phone,
            sp.messenger,
            sp.preferred_time,

            (
                SELECT COUNT(*)
                FROM teacher_students ts
                WHERE ts.student_id = u.id
                    AND ts.status = 'active'
            ) AS active_teachers_total,

            (
                SELECT COUNT(*)
                FROM lessons l
                WHERE l.student_id = u.id
            ) AS lessons_total,

            (
                SELECT COUNT(*)
                FROM homework h
                WHERE h.student_id = u.id
            ) AS homework_total

        FROM users u
        LEFT JOIN student_profiles sp
            ON sp.user_id = u.id

        {$whereSql}

        ORDER BY u.created_at DESC

        LIMIT :limit OFFSET :offset
    ");

    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();

    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    adminJsonResponse([
        'success' => true,
        'data' => [
            'items' => $items,
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
        'message' => 'Ошибка получения списка учеников',
        'error' => $error->getMessage(),
    ], 500);
}