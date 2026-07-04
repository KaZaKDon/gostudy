# api/admin/users/index.php

Назначение: список пользователей.

Статус: ✅ Реализован.

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
    $role = trim($_GET['role'] ?? '');
    $status = trim($_GET['status'] ?? '');

    $where = [];
    $params = [];

    if ($q !== '') {
        $where[] = "(
            u.full_name LIKE :q
            OR u.email LIKE :q
            OR u.phone LIKE :q
            OR CAST(u.id AS CHAR) LIKE :q
        )";

        $params['q'] = '%' . $q . '%';
    }

    if ($role !== '') {
        $where[] = "u.role = :role";
        $params['role'] = $role;
    }

    if ($status !== '') {
        $where[] = "u.status = :status";
        $params['status'] = $status;
    }

    $whereSql = '';

    if (!empty($where)) {
        $whereSql = 'WHERE ' . implode(' AND ', $where);
    }

    $countStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM users u
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
            u.role,
            u.status,
            u.blocked_reason,
            u.last_login_at,
            u.created_at,
            u.updated_at
        FROM users u
        {$whereSql}
        ORDER BY u.id DESC
        LIMIT :limit OFFSET :offset
    ");

    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();

    $items = $stmt->fetchAll();

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
        'message' => 'Ошибка получения списка пользователей',
        'error' => $error->getMessage(),
    ], 500);
}