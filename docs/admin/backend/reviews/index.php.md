<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    adminErrorResponse('Метод не поддерживается', 405);
}

try {
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int) ($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    $q = trim((string) ($_GET['q'] ?? ''));
    $status = trim((string) ($_GET['status'] ?? 'pending'));
    $target = trim((string) ($_GET['target'] ?? ''));
    $allowedStatuses = ['', 'pending', 'approved', 'rejected'];
    $allowedTargets = ['', 'review', 'reply'];

    if (!in_array($status, $allowedStatuses, true)) {
        adminErrorResponse('Некорректный статус');
    }

    if (!in_array($target, $allowedTargets, true)) {
        adminErrorResponse('Некорректный тип публикации');
    }

    $where = ['1 = 1'];
    $params = [];

    if ($q !== '') {
        $where[] = "CONCAT_WS(
            ' ',
            r.id,
            students.full_name,
            teachers.full_name,
            subjects.name
        ) LIKE :q";
        $params['q'] = '%' . $q . '%';
    }

    if ($status === 'pending') {
        $where[] = "(
            r.status = 'pending'
            OR r.reply_status = 'pending'
        )";
    } elseif ($status === 'approved') {
        $where[] = "(
            r.status = 'approved'
            OR r.reply_status = 'approved'
        )";
    } elseif ($status === 'rejected') {
        $where[] = "(
            r.status = 'rejected'
            OR r.reply_status = 'rejected'
        )";
    }

    if ($target === 'review') {
        $where[] = $status !== ''
            ? 'r.status = :target_status'
            : 'r.status IS NOT NULL';

        if ($status !== '') {
            $params['target_status'] = $status;
        }
    } elseif ($target === 'reply') {
        $where[] = $status !== ''
            ? 'r.reply_status = :target_status'
            : "r.reply_status <> 'none'";

        if ($status !== '') {
            $params['target_status'] = $status;
        }
    }

    $whereSql = implode(' AND ', $where);
    $fromSql = "
        FROM reviews r
        INNER JOIN users students
            ON students.id = r.student_id
        INNER JOIN users teachers
            ON teachers.id = r.teacher_id
        LEFT JOIN subjects
            ON subjects.id = r.subject_id
        WHERE {$whereSql}
    ";

    $countStmt = $pdo->prepare("SELECT COUNT(*) {$fromSql}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.student_id,
            r.teacher_id,
            r.teacher_student_id,
            r.subject_id,
            r.rating,
            r.text,
            r.status,
            r.rejection_reason,
            r.published_rating,
            r.published_text,
            r.published_at,
            r.teacher_reply,
            r.pending_teacher_reply,
            r.reply_status,
            r.reply_rejection_reason,
            r.created_at,
            r.updated_at,
            students.full_name AS student_name,
            students.email AS student_email,
            teachers.full_name AS teacher_name,
            teachers.email AS teacher_email,
            subjects.name AS subject_name
        {$fromSql}
        ORDER BY
            GREATEST(
                UNIX_TIMESTAMP(r.updated_at),
                UNIX_TIMESTAMP(r.created_at)
            ) DESC,
            r.id DESC
        LIMIT :limit OFFSET :offset
    ");

    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    adminSuccessResponse([
        'items' => $stmt->fetchAll(PDO::FETCH_ASSOC),
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => (int) ceil($total / $limit),
        ],
    ]);
} catch (Throwable $error) {
    error_log('admin/reviews/index.php: ' . $error->getMessage());
    adminServerErrorResponse('Ошибка получения отзывов');
}
