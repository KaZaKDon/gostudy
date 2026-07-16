<?php

declare(strict_types=1);

require_once __DIR__ . '/../../shared/require-moderator.php';
require_once __DIR__ . '/../../shared/request.php';
require_once __DIR__ . '/../../shared/validation.php';

requireAdminRequestMethod('GET');

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];

$subjectId = requireAdminPositiveId(
    $_GET['subject_id'] ?? null,
    'ID предмета'
);

try {
    $subjectStmt = $pdo->prepare("
        SELECT
            s.id,
            s.group_id,
            s.name,
            s.slug,
            s.is_active,
            s.sort_order,
            sg.name AS group_name

        FROM subjects s

        INNER JOIN subject_groups sg
            ON sg.id = s.group_id

        WHERE s.id = :id

        LIMIT 1
    ");

    $subjectStmt->execute([
        'id' => $subjectId,
    ]);

    $subject = $subjectStmt->fetch(PDO::FETCH_ASSOC);

    if (!$subject) {
        adminNotFoundResponse(
            'Предмет не найден'
        );
    }

    $subject['id'] = (int) $subject['id'];
    $subject['group_id'] = (int) $subject['group_id'];
    $subject['is_active'] = (bool) $subject['is_active'];
    $subject['sort_order'] = (int) $subject['sort_order'];

    $linksStmt = $pdo->prepare("
        SELECT
            sp.id,
            sp.subject_id,
            sp.preparation_id,
            sp.sort_order

        FROM subject_preparations sp

        WHERE sp.subject_id = :subject_id

        ORDER BY
            sp.sort_order ASC,
            sp.preparation_id ASC
    ");

    $linksStmt->execute([
        'subject_id' => $subjectId,
    ]);

    $links = $linksStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($links as &$link) {
        $link['id'] = (int) $link['id'];
        $link['subject_id'] =
            (int) $link['subject_id'];
        $link['preparation_id'] =
            (int) $link['preparation_id'];
        $link['sort_order'] =
            (int) $link['sort_order'];
    }

    unset($link);

    adminSuccessResponse([
        'subject' => $subject,
        'links' => $links,
    ]);
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка получения направлений подготовки для предмета'
    );
}