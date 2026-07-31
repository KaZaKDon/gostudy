<?php

declare(strict_types=1);

require_once __DIR__ . '/response.php';

const MESSAGE_CHANNEL_STUDENT = 'student';
const MESSAGE_CHANNEL_PARENT = 'parent';

function messageRequireSupportedRole(array $user): void
{
    if (!in_array($user['role'] ?? null, ['teacher', 'student'], true)) {
        errorResponse('Сообщения доступны только преподавателям и ученикам', 403);
    }
}

function messageParsePositiveId(mixed $value, string $fieldName): int
{
    $id = filter_var(
        $value,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($id === false) {
        errorResponse('Некорректно указано поле «' . $fieldName . '»');
    }

    return (int) $id;
}

function messageParseChannel(mixed $value): string
{
    $channel = trim((string) $value);

    if (!in_array(
        $channel,
        [MESSAGE_CHANNEL_STUDENT, MESSAGE_CHANNEL_PARENT],
        true
    )) {
        errorResponse('Некорректно указан канал переписки');
    }

    return $channel;
}

function messageRequireParticipantPair(
    PDO $pdo,
    array $user,
    int $teacherId,
    int $studentId
): array {
    messageRequireSupportedRole($user);

    if (
        ($user['role'] === 'teacher' && (int) $user['id'] !== $teacherId)
        || ($user['role'] === 'student' && (int) $user['id'] !== $studentId)
    ) {
        errorResponse('Нет доступа к этой переписке', 403);
    }

    $stmt = $pdo->prepare("
        SELECT
            ts.teacher_id,
            ts.student_id,
            MAX(CASE WHEN ts.status = 'active' THEN 1 ELSE 0 END) AS can_send,
            teacher.full_name AS teacher_name,
            student.full_name AS student_name,
            sp.parent_name
        FROM teacher_students ts
        INNER JOIN users teacher
            ON teacher.id = ts.teacher_id
           AND teacher.role = 'teacher'
        INNER JOIN users student
            ON student.id = ts.student_id
           AND student.role = 'student'
        LEFT JOIN student_profiles sp
            ON sp.user_id = ts.student_id
        WHERE ts.teacher_id = :teacher_id
          AND ts.student_id = :student_id
          AND ts.status IN ('active', 'archived')
        GROUP BY
            ts.teacher_id,
            ts.student_id,
            teacher.full_name,
            student.full_name,
            sp.parent_name
        LIMIT 1
    ");

    $stmt->execute([
        'teacher_id' => $teacherId,
        'student_id' => $studentId,
    ]);

    $pair = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$pair) {
        errorResponse('Связь преподавателя с учеником не найдена', 404);
    }

    $pair['teacher_id'] = (int) $pair['teacher_id'];
    $pair['student_id'] = (int) $pair['student_id'];
    $pair['can_send'] = (bool) $pair['can_send'];
    $pair['parent_name'] = trim((string) ($pair['parent_name'] ?? ''));

    return $pair;
}

function messageRequireChannelAvailable(
    array $pair,
    string $channel,
    bool $forSending = false
): void {
    if (
        $channel === MESSAGE_CHANNEL_PARENT
        && $pair['parent_name'] === ''
        && $forSending
    ) {
        errorResponse('В анкете ученика не указано имя родителя');
    }

    if ($forSending && !$pair['can_send']) {
        errorResponse(
            'Переписка сохранена в истории, но отправка сообщений недоступна',
            409
        );
    }
}

function messageFindDialog(
    PDO $pdo,
    int $teacherId,
    int $studentId,
    string $channel,
    bool $forUpdate = false
): ?array {
    $lockingClause = $forUpdate ? ' FOR UPDATE' : '';

    $stmt = $pdo->prepare("
        SELECT
            id,
            teacher_id,
            student_id,
            channel_type,
            last_message_at,
            created_at
        FROM dialogs
        WHERE teacher_id = :teacher_id
          AND student_id = :student_id
          AND channel_type = :channel_type
        LIMIT 1{$lockingClause}
    ");

    $stmt->execute([
        'teacher_id' => $teacherId,
        'student_id' => $studentId,
        'channel_type' => $channel,
    ]);

    $dialog = $stmt->fetch(PDO::FETCH_ASSOC);

    return $dialog ?: null;
}

function messageSenderContext(array $user, string $channel): string
{
    if ($user['role'] === 'teacher') {
        return 'teacher';
    }

    return $channel === MESSAGE_CHANNEL_PARENT
        ? 'parent'
        : 'student';
}

function messageAuthorName(
    array $user,
    array $pair,
    string $senderContext
): string {
    if ($senderContext === 'parent') {
        return $pair['parent_name'];
    }

    if ($senderContext === 'teacher') {
        return (string) $pair['teacher_name'];
    }

    return (string) $pair['student_name'];
}
