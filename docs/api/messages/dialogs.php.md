<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/messages.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();
messageRequireSupportedRole($user);

try {
    $pdo = getDatabaseConnection();

    $participantColumn = $user['role'] === 'teacher'
        ? 'ts.teacher_id'
        : 'ts.student_id';

    $pairsStmt = $pdo->prepare("
        SELECT
            ts.teacher_id,
            ts.student_id,
            MAX(CASE WHEN ts.status = 'active' THEN 1 ELSE 0 END) AS can_send,
            teacher.full_name AS teacher_name,
            student.full_name AS student_name,
            student.avatar_url AS student_avatar_url,
            teacher.avatar_url AS teacher_avatar_url,
            sp.class_level,
            sp.parent_name,
            GROUP_CONCAT(
                DISTINCT subjects.name
                ORDER BY subjects.name
                SEPARATOR ', '
            ) AS subject_names
        FROM teacher_students ts
        INNER JOIN users teacher
            ON teacher.id = ts.teacher_id
           AND teacher.role = 'teacher'
        INNER JOIN users student
            ON student.id = ts.student_id
           AND student.role = 'student'
        LEFT JOIN student_profiles sp
            ON sp.user_id = ts.student_id
        LEFT JOIN subjects
            ON subjects.id = ts.subject_id
        WHERE {$participantColumn} = :participant_id
          AND ts.status IN ('active', 'archived')
        GROUP BY
            ts.teacher_id,
            ts.student_id,
            teacher.full_name,
            student.full_name,
            student.avatar_url,
            teacher.avatar_url,
            sp.class_level,
            sp.parent_name
        ORDER BY teacher.full_name, student.full_name
    ");

    $pairsStmt->execute([
        'participant_id' => $user['id'],
    ]);

    $participantPairs = $pairsStmt->fetchAll(PDO::FETCH_ASSOC);

    $dialogParticipantColumn = $user['role'] === 'teacher'
        ? 'd.teacher_id'
        : 'd.student_id';

    $unreadSenderCondition = $user['role'] === 'teacher'
        ? "incoming.sender_context IN ('student', 'parent')"
        : "incoming.sender_context = 'teacher'";

    $dialogsStmt = $pdo->prepare("
        SELECT
            d.id,
            d.teacher_id,
            d.student_id,
            d.channel_type,
            d.last_message_at,
            last_message.message_text AS last_message,
            (
                SELECT COUNT(*)
                FROM messages incoming
                WHERE incoming.dialog_id = d.id
                  AND incoming.is_read = 0
                  AND {$unreadSenderCondition}
            ) AS unread_count
        FROM dialogs d
        LEFT JOIN messages last_message
            ON last_message.id = (
                SELECT latest.id
                FROM messages latest
                WHERE latest.dialog_id = d.id
                ORDER BY latest.id DESC
                LIMIT 1
            )
        WHERE {$dialogParticipantColumn} = :participant_id
    ");

    $dialogsStmt->execute([
        'participant_id' => $user['id'],
    ]);

    $dialogsByPair = [];

    foreach ($dialogsStmt->fetchAll(PDO::FETCH_ASSOC) as $dialog) {
        $key = implode(':', [
            $dialog['teacher_id'],
            $dialog['student_id'],
            $dialog['channel_type'],
        ]);

        $dialogsByPair[$key] = $dialog;
    }

    $dialogs = [];
    $totalUnread = 0;

    foreach ($participantPairs as $pair) {
        $parentName = trim((string) ($pair['parent_name'] ?? ''));
        $channels = [MESSAGE_CHANNEL_STUDENT];

        $studentDialogKey = implode(':', [
            $pair['teacher_id'],
            $pair['student_id'],
            MESSAGE_CHANNEL_STUDENT,
        ]);

        $parentDialogKey = implode(':', [
            $pair['teacher_id'],
            $pair['student_id'],
            MESSAGE_CHANNEL_PARENT,
        ]);

        if (
            !(bool) $pair['can_send']
            && !isset($dialogsByPair[$studentDialogKey])
            && !isset($dialogsByPair[$parentDialogKey])
        ) {
            continue;
        }

        if ($parentName !== '' || isset($dialogsByPair[$parentDialogKey])) {
            $channels[] = MESSAGE_CHANNEL_PARENT;
        }

        foreach ($channels as $channel) {
            $dialogKey = implode(':', [
                $pair['teacher_id'],
                $pair['student_id'],
                $channel,
            ]);

            $storedDialog = $dialogsByPair[$dialogKey] ?? null;
            $unreadCount = (int) ($storedDialog['unread_count'] ?? 0);
            $totalUnread += $unreadCount;

            if ($user['role'] === 'teacher') {
                $displayName = $channel === MESSAGE_CHANNEL_PARENT
                    ? ($parentName !== '' ? $parentName : 'Родитель ученика')
                    : $pair['student_name'];

                $subtitle = $channel === MESSAGE_CHANNEL_PARENT
                    ? 'Родитель · ' . $pair['student_name']
                    : implode(' · ', array_filter([
                        $pair['class_level'] ?? null,
                        $pair['subject_names'] ?? null,
                    ]));

                $avatarUrl = $channel === MESSAGE_CHANNEL_STUDENT
                    ? $pair['student_avatar_url']
                    : null;
            } else {
                $displayName = $pair['teacher_name'];
                $subtitle = $channel === MESSAGE_CHANNEL_PARENT
                    ? implode(' · ', array_filter([
                        'Переписка родителя',
                        $pair['subject_names'] ?? null,
                    ]))
                    : implode(' · ', array_filter([
                        'Преподаватель',
                        $pair['subject_names'] ?? null,
                    ]));

                $avatarUrl = $pair['teacher_avatar_url'];
            }

            $dialogs[] = [
                'id' => isset($storedDialog['id'])
                    ? (int) $storedDialog['id']
                    : null,
                'key' => $dialogKey,
                'teacher_id' => (int) $pair['teacher_id'],
                'student_id' => (int) $pair['student_id'],
                'channel_type' => $channel,
                'display_name' => $displayName,
                'subtitle' => $subtitle,
                'avatar_url' => $avatarUrl,
                'last_message' => $storedDialog['last_message'] ?? '',
                'last_message_at' => $storedDialog['last_message_at'] ?? null,
                'unread_count' => $unreadCount,
                'can_send' => (bool) $pair['can_send']
                    && ($channel !== MESSAGE_CHANNEL_PARENT || $parentName !== ''),
            ];
        }
    }

    usort(
        $dialogs,
        static function (array $left, array $right): int {
            $leftTime = $left['last_message_at'] ?? '';
            $rightTime = $right['last_message_at'] ?? '';

            if ($leftTime !== $rightTime) {
                return $rightTime <=> $leftTime;
            }

            return strnatcasecmp(
                (string) $left['display_name'],
                (string) $right['display_name']
            );
        }
    );

    successResponse([
        'dialogs' => $dialogs,
        'total_unread' => $totalUnread,
    ]);
} catch (Throwable $error) {
    error_log('messages/dialogs.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить диалоги', 500);
}
