<?php

declare(strict_types=1);

require_once __DIR__ . '/../../shared/require-moderator.php';
require_once __DIR__ . '/../../shared/request.php';

requireAdminRequestMethod('GET');

$auth = requireAdminOrModerator();
$pdo = $auth['pdo'];

try {
    $subjectsStmt = $pdo->query("
        SELECT
            s.id,
            s.group_id,
            s.name,
            s.slug,
            s.is_active,
            s.sort_order,
            sg.name AS group_name,
            sg.sort_order AS group_sort_order,

            (
                SELECT COUNT(*)
                FROM subject_preparations sp
                WHERE sp.subject_id = s.id
            ) AS preparations_total

        FROM subjects s

        INNER JOIN subject_groups sg
            ON sg.id = s.group_id

        ORDER BY
            sg.sort_order ASC,
            sg.name ASC,
            s.sort_order ASC,
            s.name ASC,
            s.id ASC
    ");

    $subjects = $subjectsStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($subjects as &$subject) {
        $subject['id'] = (int) $subject['id'];
        $subject['group_id'] = (int) $subject['group_id'];
        $subject['is_active'] = (bool) $subject['is_active'];
        $subject['sort_order'] = (int) $subject['sort_order'];
        $subject['group_sort_order'] =
            (int) $subject['group_sort_order'];
        $subject['preparations_total'] =
            (int) $subject['preparations_total'];
    }

    unset($subject);

    $groupsStmt = $pdo->query("
        SELECT
            pg.id,
            pg.name,
            pg.slug,
            pg.is_active,
            pg.sort_order

        FROM preparation_groups pg

        ORDER BY
            pg.sort_order ASC,
            pg.name ASC,
            pg.id ASC
    ");

    $preparationGroups =
        $groupsStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach (
        $preparationGroups
        as &$preparationGroup
    ) {
        $preparationGroup['id'] =
            (int) $preparationGroup['id'];

        $preparationGroup['is_active'] =
            (bool) $preparationGroup['is_active'];

        $preparationGroup['sort_order'] =
            (int) $preparationGroup['sort_order'];
    }

    unset($preparationGroup);

    $preparationsStmt = $pdo->query("
        SELECT
            p.id,
            p.group_id,
            p.name,
            p.slug,
            p.is_active,
            p.sort_order,
            pg.name AS group_name,
            pg.sort_order AS group_sort_order

        FROM preparations p

        INNER JOIN preparation_groups pg
            ON pg.id = p.group_id

        ORDER BY
            pg.sort_order ASC,
            pg.name ASC,
            p.sort_order ASC,
            p.name ASC,
            p.id ASC
    ");

    $preparations =
        $preparationsStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($preparations as &$preparation) {
        $preparation['id'] =
            (int) $preparation['id'];

        $preparation['group_id'] =
            (int) $preparation['group_id'];

        $preparation['is_active'] =
            (bool) $preparation['is_active'];

        $preparation['sort_order'] =
            (int) $preparation['sort_order'];

        $preparation['group_sort_order'] =
            (int) $preparation['group_sort_order'];
    }

    unset($preparation);

    adminSuccessResponse([
        'subjects' => $subjects,
        'preparation_groups' =>
            $preparationGroups,
        'preparations' => $preparations,
    ]);
} catch (Throwable $error) {
    adminServerErrorResponse(
        'Ошибка получения данных для связей предметов и направлений подготовки'
    );
}