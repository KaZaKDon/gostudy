<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/classroom.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Личные заметки доступны только преподавателю', 403);
}

$data = getJsonInput();

try {
    $lessonId = classroomParsePositiveId($data['lesson_id'] ?? null, 'урок');
    $noteText = trim((string) ($data['note_text'] ?? ''));

    if (mb_strlen($noteText) > CLASSROOM_NOTE_MAX_LENGTH) {
        errorResponse(
            'Заметка не должна превышать '
                . CLASSROOM_NOTE_MAX_LENGTH
                . ' символов'
        );
    }

    $pdo = getDatabaseConnection();
    $lesson = classroomFindLesson($pdo, $lessonId, $user);

    if (!$lesson) {
        errorResponse('Урок не найден', 404);
    }

    if ($lesson['status'] === 'cancelled') {
        errorResponse('Для отменённого урока нельзя сохранить заметку', 409);
    }

    if ($noteText === '') {
        $saveStmt = $pdo->prepare("
            UPDATE lesson_results
            SET teacher_note = NULL
            WHERE lesson_id = :lesson_id
        ");
        $saveStmt->execute(['lesson_id' => $lessonId]);
    } else {
        $saveStmt = $pdo->prepare("
            INSERT INTO lesson_results (lesson_id, teacher_note)
            VALUES (:lesson_id, :teacher_note)
            ON DUPLICATE KEY UPDATE teacher_note = VALUES(teacher_note)
        ");
        $saveStmt->execute([
            'lesson_id' => $lessonId,
            'teacher_note' => $noteText,
        ]);
    }

    successResponse([
        'message' => 'Заметка сохранена',
        'teacher_note' => $noteText,
    ]);
} catch (InvalidArgumentException $error) {
    errorResponse($error->getMessage());
} catch (Throwable $error) {
    error_log('classroom/save-note.php: ' . $error->getMessage());
    errorResponse('Не удалось сохранить заметку', 500);
}
