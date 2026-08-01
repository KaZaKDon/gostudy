<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/homework.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
$homeworkId = homeworkParsePositiveId($_GET['id'] ?? null, 'задание');

try {
    $pdo = getDatabaseConnection();
    $timezone = homeworkUserTimezone($pdo, (int) $user['id'], (string) $user['role']);
    $row = homeworkFindForUser($pdo, $homeworkId, $user);

    if (!$row) {
        errorResponse('Домашнее задание не найдено', 404);
    }

    $homework = homeworkNormalizeRow($row, $timezone);
    $homework['attachments'] = homeworkLoadAttachments($pdo, $homeworkId);
    $homework['submissions'] = homeworkLoadSubmissions($pdo, $homeworkId, $timezone);

    successResponse(['homework' => $homework]);
} catch (Throwable $error) {
    error_log('homework/show.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить домашнее задание', 500);
}