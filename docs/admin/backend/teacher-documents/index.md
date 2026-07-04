<?php

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();

$pdo = $auth['pdo'];

try {
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(100, max(10, (int) ($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $status = trim($_GET['status'] ?? '');
    $type = trim($_GET['type'] ?? '');
    $teacherId = (int) ($_GET['teacher_id'] ?? 0);

    $where = [];
    $params = [];

    if ($status !== '') {
        $where[] = 'td.status = :status';
        $params['status'] = $status;
    }

    if ($type !== '') {
        $where[] = 'td.type = :type';
        $params['type'] = $type;
    }

    if ($teacherId > 0) {
        $where[] = 'td.teacher_id = :teacher_id';
        $params['teacher_id'] = $teacherId;
    }

    $whereSql = $where
        ? 'WHERE ' . implode(' AND ', $where)
        : '';

    $countStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM teacher_documents td
        {$whereSql}
    ");

    $countStmt->execute($params);

    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT
            td.id,
            td.teacher_id,
            td.type,
            td.file_url,
            td.original_name,
            td.status,
            td.reject_reason,
            td.checked_at,
            td.created_at,

            u.full_name,
            u.email

        FROM teacher_documents td

        INNER JOIN users u
            ON u.id = td.teacher_id

        {$whereSql}

        ORDER BY td.created_at DESC

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
        'message' => 'Ошибка получения списка документов',
        'error' => $error->getMessage(),
    ], 500);
}