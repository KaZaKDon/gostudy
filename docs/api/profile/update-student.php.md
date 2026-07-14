<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'student') {
    errorResponse('Анкету ученика может сохранять только ученик', 403);
}

$data = getJsonInput();

$firstName = trim((string) ($data['first_name'] ?? ''));
$lastName = trim((string) ($data['last_name'] ?? ''));
$phone = trim((string) ($data['phone'] ?? ''));
$city = trim((string) ($data['city'] ?? ''));
$timezone = trim((string) ($data['timezone'] ?? ''));
$birthYear = $data['birth_year'] ?? null;
$classLevel = trim((string) ($data['class_level'] ?? ''));
$subjects = trim((string) ($data['subjects'] ?? ''));
$goal = trim((string) ($data['goal'] ?? ''));
$learningGoals = trim((string) ($data['learning_goals'] ?? ''));
$levelDescription = trim((string) ($data['level_description'] ?? ''));
$lessonFormat = trim((string) ($data['lesson_format'] ?? ''));
$parentName = trim((string) ($data['parent_name'] ?? ''));
$parentPhone = trim((string) ($data['parent_phone'] ?? ''));
$parentEmail = mb_strtolower(trim((string) ($data['parent_email'] ?? '')));
$messenger = trim((string) ($data['messenger'] ?? ''));
$contactPreference = trim((string) ($data['contact_preference'] ?? ''));
$preferredTime = trim((string) ($data['preferred_time'] ?? ''));
$scheduleComment = trim((string) ($data['schedule_comment'] ?? ''));
$about = trim((string) ($data['about'] ?? ''));

if ($firstName === '') {
    errorResponse('Укажите имя ученика');
}

if ($lastName === '') {
    errorResponse('Укажите фамилию ученика');
}

if ($parentEmail !== '' && !filter_var($parentEmail, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Некорректный email родителя');
}

if ($birthYear !== null && $birthYear !== '') {
    $birthYear = (int) $birthYear;
    $currentYear = (int) date('Y');

    if ($birthYear < 1940 || $birthYear > $currentYear) {
        errorResponse('Некорректный год рождения');
    }
} else {
    $birthYear = null;
}

$fullName = trim($firstName . ' ' . $lastName);

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $profileStmt = $pdo->prepare("
        INSERT INTO student_profiles (
            user_id,
            first_name,
            last_name,
            city,
            timezone,
            birth_year,
            class_level,
            subjects,
            goal,
            learning_goals,
            level_description,
            lesson_format,
            parent_name,
            parent_phone,
            parent_email,
            messenger,
            contact_preference,
            preferred_time,
            schedule_comment,
            about,
            profile_version,
            profile_completion
        ) VALUES (
            :user_id,
            :first_name,
            :last_name,
            :city,
            :timezone,
            :birth_year,
            :class_level,
            :subjects,
            :goal,
            :learning_goals,
            :level_description,
            :lesson_format,
            :parent_name,
            :parent_phone,
            :parent_email,
            :messenger,
            :contact_preference,
            :preferred_time,
            :schedule_comment,
            :about,
            1,
            100
        )
        ON DUPLICATE KEY UPDATE
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            city = VALUES(city),
            timezone = VALUES(timezone),
            birth_year = VALUES(birth_year),
            class_level = VALUES(class_level),
            subjects = VALUES(subjects),
            goal = VALUES(goal),
            learning_goals = VALUES(learning_goals),
            level_description = VALUES(level_description),
            lesson_format = VALUES(lesson_format),
            parent_name = VALUES(parent_name),
            parent_phone = VALUES(parent_phone),
            parent_email = VALUES(parent_email),
            messenger = VALUES(messenger),
            contact_preference = VALUES(contact_preference),
            preferred_time = VALUES(preferred_time),
            schedule_comment = VALUES(schedule_comment),
            about = VALUES(about),
            profile_version = 1,
            profile_completion = 100,
            updated_at = CURRENT_TIMESTAMP
    ");

    $profileStmt->execute([
        'user_id' => $user['id'],
        'first_name' => $firstName,
        'last_name' => $lastName,
        'city' => $city !== '' ? $city : null,
        'timezone' => $timezone !== '' ? $timezone : null,
        'birth_year' => $birthYear,
        'class_level' => $classLevel !== '' ? $classLevel : null,
        'subjects' => $subjects !== '' ? $subjects : null,
        'goal' => $goal !== '' ? $goal : null,
        'learning_goals' => $learningGoals !== '' ? $learningGoals : null,
        'level_description' => $levelDescription !== '' ? $levelDescription : null,
        'lesson_format' => $lessonFormat !== '' ? $lessonFormat : null,
        'parent_name' => $parentName !== '' ? $parentName : null,
        'parent_phone' => $parentPhone !== '' ? $parentPhone : null,
        'parent_email' => $parentEmail !== '' ? $parentEmail : null,
        'messenger' => $messenger !== '' ? $messenger : null,
        'contact_preference' => $contactPreference !== '' ? $contactPreference : null,
        'preferred_time' => $preferredTime !== '' ? $preferredTime : null,
        'schedule_comment' => $scheduleComment !== '' ? $scheduleComment : null,
        'about' => $about !== '' ? $about : null,
    ]);

    $userStmt = $pdo->prepare("
        UPDATE users
        SET
            full_name = :full_name,
            phone = :phone,
            profile_completed = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ");

    $userStmt->execute([
        'full_name' => $fullName,
        'phone' => $phone !== '' ? $phone : null,
        'id' => $user['id'],
    ]);

    $profileSelectStmt = $pdo->prepare("
        SELECT *
        FROM student_profiles
        WHERE user_id = :user_id
        LIMIT 1
    ");

    $profileSelectStmt->execute([
        'user_id' => $user['id'],
    ]);

    $profile = $profileSelectStmt->fetch();

    $pdo->commit();

    successResponse([
        'message' => 'Анкета ученика сохранена',
        'user' => [
            ...$user,
            'full_name' => $fullName,
            'phone' => $phone !== '' ? $phone : null,
            'profile_completed' => true,
        ],
        'profile' => $profile,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Ошибка сохранения анкеты ученика', 500);
}