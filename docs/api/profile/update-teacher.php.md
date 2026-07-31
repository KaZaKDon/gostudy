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

if ($user['role'] !== 'teacher') {
    errorResponse('Анкету преподавателя может сохранять только преподаватель', 403);
}

function teacherProfileString(
    array $data,
    string $key,
    int $maxLength,
    string $label,
    bool $required = false
): ?string {
    $value = trim((string) ($data[$key] ?? ''));

    if ($required && $value === '') {
        errorResponse('Заполните поле «' . $label . '»');
    }

    if (mb_strlen($value) > $maxLength) {
        errorResponse('Поле «' . $label . '» слишком длинное');
    }

    return $value !== '' ? $value : null;
}

function teacherProfileIdList(mixed $value, string $label): array
{
    if (!is_array($value)) {
        errorResponse('Поле «' . $label . '» должно быть массивом');
    }

    $ids = [];

    foreach ($value as $item) {
        $id = filter_var($item, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);

        if ($id === false) {
            errorResponse('Поле «' . $label . '» содержит некорректный ID');
        }

        $ids[(int) $id] = (int) $id;
    }

    return array_values($ids);
}

function teacherProfilePrice(mixed $value, string $label): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    if (!is_numeric($value)) {
        errorResponse('В поле «' . $label . '» должна быть указана сумма');
    }

    $price = round((float) $value, 2);

    if ($price < 0 || $price > 1000000) {
        errorResponse('В поле «' . $label . '» указана некорректная сумма');
    }

    return number_format($price, 2, '.', '');
}

function teacherProfileNullableInt(
    mixed $value,
    int $min,
    int $max,
    string $label
): ?int {
    if ($value === null || $value === '') {
        return null;
    }

    $number = filter_var($value, FILTER_VALIDATE_INT);

    if ($number === false || $number < $min || $number > $max) {
        errorResponse('Поле «' . $label . '» заполнено некорректно');
    }

    return (int) $number;
}

$data = getJsonInput();

$firstName = teacherProfileString($data, 'first_name', 120, 'Имя', true);
$lastName = teacherProfileString($data, 'last_name', 120, 'Фамилия', true);
$city = teacherProfileString($data, 'city', 120, 'Город', true);
$timezone = teacherProfileString($data, 'timezone', 80, 'Часовой пояс');
$headline = teacherProfileString($data, 'headline', 180, 'Короткий заголовок', true);
$about = teacherProfileString($data, 'about', 10000, 'О себе', true);
$teachingMethod = teacherProfileString(
    $data,
    'teaching_method',
    10000,
    'Как проходят занятия',
    true
);
$firstLessonDescription = teacherProfileString(
    $data,
    'first_lesson_description',
    10000,
    'Первое занятие'
);
$studentGets = teacherProfileString(
    $data,
    'student_gets',
    10000,
    'Что получает ученик'
);
$pricingComment = teacherProfileString(
    $data,
    'pricing_comment',
    10000,
    'Дополнительные условия'
);
$scheduleDescription = teacherProfileString(
    $data,
    'schedule_description',
    10000,
    'Расписание',
    true
);
$accessibilityComment = teacherProfileString(
    $data,
    'accessibility_comment',
    10000,
    'Комментарий к доступному образованию'
);
$authorMaterialsDescription = teacherProfileString(
    $data,
    'author_materials_description',
    10000,
    'Описание авторских материалов'
);
$experienceYears = teacherProfileNullableInt(
    $data['experience_years'] ?? null,
    0,
    80,
    'Опыт преподавания'
);

if ($experienceYears === null) {
    errorResponse('Укажите опыт преподавания');
}

$subjectIds = teacherProfileIdList($data['subject_ids'] ?? null, 'Предметы');
$ageGroupIds = teacherProfileIdList($data['age_group_ids'] ?? null, 'Возраст учеников');

if ($subjectIds === []) {
    errorResponse('Выберите хотя бы один предмет');
}

if ($ageGroupIds === []) {
    errorResponse('Выберите хотя бы одну возрастную группу');
}

$normalizedSubjectPreparations = [];
$preparationPairs = [];
$rawSubjectPreparations = $data['subject_preparations'] ?? [];

if (!is_array($rawSubjectPreparations)) {
    errorResponse('Поле «Направления подготовки» должно быть массивом');
}

foreach ($rawSubjectPreparations as $item) {
    if (!is_array($item)) {
        errorResponse('Некорректная структура направлений подготовки');
    }

    $subjectId = filter_var($item['subject_id'] ?? null, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
    ]);

    if ($subjectId === false || !in_array((int) $subjectId, $subjectIds, true)) {
        errorResponse('Направление указано для предмета, который не выбран');
    }

    $preparationIds = teacherProfileIdList(
        $item['preparation_ids'] ?? null,
        'Направления подготовки'
    );

    foreach ($preparationIds as $preparationId) {
        $pairKey = (int) $subjectId . ':' . $preparationId;
        $preparationPairs[$pairKey] = [
            'subject_id' => (int) $subjectId,
            'preparation_id' => $preparationId,
        ];
    }

    $normalizedSubjectPreparations[(int) $subjectId] = [
        'subject_id' => (int) $subjectId,
        'preparation_ids' => $preparationIds,
    ];
}

$educationInput = $data['education'] ?? [];

if (!is_array($educationInput)) {
    errorResponse('Поле «Образование» должно быть массивом');
}

if (count($educationInput) > 10) {
    errorResponse('Можно указать не более десяти записей об образовании');
}

$education = [];

foreach ($educationInput as $index => $item) {
    if (!is_array($item)) {
        errorResponse('Некорректная запись об образовании');
    }

    $institution = trim((string) ($item['institution'] ?? ''));
    $faculty = trim((string) ($item['faculty'] ?? ''));
    $speciality = trim((string) ($item['speciality'] ?? ''));
    $qualification = trim((string) ($item['qualification'] ?? ''));
    $description = trim((string) ($item['description'] ?? ''));
    $graduationYearValue = $item['graduation_year'] ?? null;

    $isEmpty = $institution === ''
        && $faculty === ''
        && $speciality === ''
        && $qualification === ''
        && $description === ''
        && ($graduationYearValue === null || $graduationYearValue === '');

    if ($isEmpty) {
        continue;
    }

    if ($institution === '') {
        errorResponse('Укажите учебное заведение');
    }

    foreach ([
        'Учебное заведение' => $institution,
        'Факультет' => $faculty,
        'Специальность' => $speciality,
        'Квалификация' => $qualification,
    ] as $label => $value) {
        if (mb_strlen($value) > 255) {
            errorResponse('Поле «' . $label . '» слишком длинное');
        }
    }

    if (mb_strlen($description) > 10000) {
        errorResponse('Описание образования слишком длинное');
    }

    $graduationYear = teacherProfileNullableInt(
        $graduationYearValue,
        1950,
        2100,
        'Год окончания'
    );

    $educationId = filter_var($item['id'] ?? null, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
    ]);

    $education[] = [
        'id' => $educationId !== false ? (int) $educationId : null,
        'institution' => $institution,
        'faculty' => $faculty !== '' ? $faculty : null,
        'speciality' => $speciality !== '' ? $speciality : null,
        'qualification' => $qualification !== '' ? $qualification : null,
        'graduation_year' => $graduationYear,
        'description' => $description !== '' ? $description : null,
        'is_primary' => !empty($item['is_primary']),
        'sort_order' => ($index + 1) * 10,
    ];
}

if ($education === []) {
    errorResponse('Добавьте хотя бы одну запись об образовании');
}

$primaryIndexes = array_keys(
    array_filter(
        $education,
        static fn (array $item): bool => $item['is_primary']
    )
);

$primaryIndex = $primaryIndexes[0] ?? 0;

foreach ($education as $index => &$educationItem) {
    $educationItem['is_primary'] = $index === $primaryIndex;
}
unset($educationItem);

$price45 = teacherProfilePrice($data['price_45'] ?? null, '45 минут');
$price60 = teacherProfilePrice($data['price_60'] ?? null, '60 минут');
$price90 = teacherProfilePrice($data['price_90'] ?? null, '90 минут');

if (
    (float) ($price45 ?? 0) <= 0
    && (float) ($price60 ?? 0) <= 0
    && (float) ($price90 ?? 0) <= 0
) {
    errorResponse('Укажите стоимость хотя бы одной продолжительности занятия');
}

$trialLessonEnabled = !empty($data['trial_lesson_enabled']);
$accessibilityEnabled = !empty($data['accessibility_enabled']);
$accessibilityFreeLessons = $accessibilityEnabled
    && !empty($data['accessibility_free_lessons']);
$accessibilityDiscount = $accessibilityEnabled
    && !empty($data['accessibility_discount']);
$accessibilityIndividual = $accessibilityEnabled
    && !empty($data['accessibility_individual']);
$accessibilitySlots = $accessibilityEnabled
    ? teacherProfileNullableInt(
        $data['accessibility_slots'] ?? null,
        1,
        10,
        'Количество учеников по программе доступного образования'
    )
    : null;
$usesAuthorMaterials = !empty($data['uses_author_materials']);
$sellsAuthorMaterials = !empty($data['sells_author_materials']);

if (!$usesAuthorMaterials) {
    $authorMaterialsDescription = null;
}

$fullName = trim($firstName . ' ' . $lastName);
$slug = 'teacher-' . $user['id'];

try {
    $pdo = getDatabaseConnection();

    $subjectPlaceholders = implode(',', array_fill(0, count($subjectIds), '?'));
    $subjectsStmt = $pdo->prepare("
        SELECT s.id
        FROM subjects s
        INNER JOIN subject_groups sg
            ON sg.id = s.group_id
        WHERE s.id IN ($subjectPlaceholders)
          AND s.is_active = 1
          AND sg.is_active = 1
    ");
    $subjectsStmt->execute($subjectIds);
    $existingSubjectIds = array_map('intval', $subjectsStmt->fetchAll(PDO::FETCH_COLUMN));

    sort($existingSubjectIds);
    $sortedSubjectIds = $subjectIds;
    sort($sortedSubjectIds);

    if ($existingSubjectIds !== $sortedSubjectIds) {
        errorResponse('Один или несколько выбранных предметов недоступны');
    }

    $agePlaceholders = implode(',', array_fill(0, count($ageGroupIds), '?'));
    $ageGroupsStmt = $pdo->prepare("
        SELECT id
        FROM student_age_groups
        WHERE id IN ($agePlaceholders)
          AND is_active = 1
    ");
    $ageGroupsStmt->execute($ageGroupIds);
    $existingAgeGroupIds = array_map('intval', $ageGroupsStmt->fetchAll(PDO::FETCH_COLUMN));

    sort($existingAgeGroupIds);
    $sortedAgeGroupIds = $ageGroupIds;
    sort($sortedAgeGroupIds);

    if ($existingAgeGroupIds !== $sortedAgeGroupIds) {
        errorResponse('Одна или несколько возрастных групп недоступны');
    }

    if ($preparationPairs !== []) {
        $allowedPreparationsStmt = $pdo->prepare("
            SELECT
                sp.subject_id,
                sp.preparation_id
            FROM subject_preparations sp
            INNER JOIN preparations p
                ON p.id = sp.preparation_id
            INNER JOIN preparation_groups pg
                ON pg.id = p.group_id
            WHERE sp.subject_id IN ($subjectPlaceholders)
              AND p.is_active = 1
              AND pg.is_active = 1
        ");
        $allowedPreparationsStmt->execute($subjectIds);

        $allowedPairs = [];

        foreach ($allowedPreparationsStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $allowedPairs[(int) $row['subject_id'] . ':' . (int) $row['preparation_id']] = true;
        }

        foreach (array_keys($preparationPairs) as $pairKey) {
            if (!isset($allowedPairs[$pairKey])) {
                errorResponse('Выбрано направление, недоступное для указанного предмета');
            }
        }
    }

    $existingEducationStmt = $pdo->prepare("
        SELECT id
        FROM teacher_education
        WHERE teacher_id = :teacher_id
    ");
    $existingEducationStmt->execute(['teacher_id' => $user['id']]);
    $existingEducationIds = array_map(
        'intval',
        $existingEducationStmt->fetchAll(PDO::FETCH_COLUMN)
    );

    foreach ($education as $item) {
        if ($item['id'] !== null && !in_array($item['id'], $existingEducationIds, true)) {
            errorResponse('Запись об образовании не принадлежит преподавателю');
        }
    }

    $pdo->beginTransaction();

    $profileStmt = $pdo->prepare("
        INSERT INTO teacher_profiles (
            user_id,
            first_name,
            last_name,
            slug,
            city,
            timezone,
            headline,
            experience_years,
            about,
            teaching_method,
            first_lesson_description,
            student_gets,
            price_45,
            price_60,
            price_90,
            pricing_comment,
            trial_lesson_enabled,
            schedule_description,
            accessibility_enabled,
            accessibility_free_lessons,
            accessibility_discount,
            accessibility_individual,
            accessibility_slots,
            accessibility_comment,
            uses_author_materials,
            sells_author_materials,
            author_materials_description,
            verification_status,
            profile_completion,
            profile_version
        ) VALUES (
            :user_id,
            :first_name,
            :last_name,
            :slug,
            :city,
            :timezone,
            :headline,
            :experience_years,
            :about,
            :teaching_method,
            :first_lesson_description,
            :student_gets,
            :price_45,
            :price_60,
            :price_90,
            :pricing_comment,
            :trial_lesson_enabled,
            :schedule_description,
            :accessibility_enabled,
            :accessibility_free_lessons,
            :accessibility_discount,
            :accessibility_individual,
            :accessibility_slots,
            :accessibility_comment,
            :uses_author_materials,
            :sells_author_materials,
            :author_materials_description,
            'pending',
            100,
            2
        )
        ON DUPLICATE KEY UPDATE
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            slug = COALESCE(slug, VALUES(slug)),
            city = VALUES(city),
            timezone = VALUES(timezone),
            headline = VALUES(headline),
            experience_years = VALUES(experience_years),
            about = VALUES(about),
            teaching_method = VALUES(teaching_method),
            first_lesson_description = VALUES(first_lesson_description),
            student_gets = VALUES(student_gets),
            price_45 = VALUES(price_45),
            price_60 = VALUES(price_60),
            price_90 = VALUES(price_90),
            pricing_comment = VALUES(pricing_comment),
            trial_lesson_enabled = VALUES(trial_lesson_enabled),
            schedule_description = VALUES(schedule_description),
            accessibility_enabled = VALUES(accessibility_enabled),
            accessibility_free_lessons = VALUES(accessibility_free_lessons),
            accessibility_discount = VALUES(accessibility_discount),
            accessibility_individual = VALUES(accessibility_individual),
            accessibility_slots = VALUES(accessibility_slots),
            accessibility_comment = VALUES(accessibility_comment),
            uses_author_materials = VALUES(uses_author_materials),
            sells_author_materials = VALUES(sells_author_materials),
            author_materials_description = VALUES(author_materials_description),
            is_verified = 0,
            verification_status = 'pending',
            verification_comment = NULL,
            verified_by = NULL,
            verified_at = NULL,
            profile_completion = 100,
            profile_version = 2,
            updated_at = CURRENT_TIMESTAMP
    ");

    $profileStmt->execute([
        'user_id' => $user['id'],
        'first_name' => $firstName,
        'last_name' => $lastName,
        'slug' => $slug,
        'city' => $city,
        'timezone' => $timezone,
        'headline' => $headline,
        'experience_years' => $experienceYears,
        'about' => $about,
        'teaching_method' => $teachingMethod,
        'first_lesson_description' => $firstLessonDescription,
        'student_gets' => $studentGets,
        'price_45' => $price45,
        'price_60' => $price60,
        'price_90' => $price90,
        'pricing_comment' => $pricingComment,
        'trial_lesson_enabled' => (int) $trialLessonEnabled,
        'schedule_description' => $scheduleDescription,
        'accessibility_enabled' => (int) $accessibilityEnabled,
        'accessibility_free_lessons' => (int) $accessibilityFreeLessons,
        'accessibility_discount' => (int) $accessibilityDiscount,
        'accessibility_individual' => (int) $accessibilityIndividual,
        'accessibility_slots' => $accessibilitySlots,
        'accessibility_comment' => $accessibilityEnabled ? $accessibilityComment : null,
        'uses_author_materials' => (int) $usesAuthorMaterials,
        'sells_author_materials' => (int) $sellsAuthorMaterials,
        'author_materials_description' => $authorMaterialsDescription,
    ]);

    $deletePreparationsStmt = $pdo->prepare("
        DELETE FROM teacher_subject_preparations
        WHERE teacher_id = :teacher_id
    ");
    $deletePreparationsStmt->execute(['teacher_id' => $user['id']]);

    $deleteSubjectsStmt = $pdo->prepare("
        DELETE FROM teacher_subjects
        WHERE teacher_id = :teacher_id
    ");
    $deleteSubjectsStmt->execute(['teacher_id' => $user['id']]);

    $insertSubjectStmt = $pdo->prepare("
        INSERT INTO teacher_subjects (teacher_id, subject_id)
        VALUES (:teacher_id, :subject_id)
    ");

    foreach ($subjectIds as $subjectId) {
        $insertSubjectStmt->execute([
            'teacher_id' => $user['id'],
            'subject_id' => $subjectId,
        ]);
    }

    if ($preparationPairs !== []) {
        $insertPreparationStmt = $pdo->prepare("
            INSERT INTO teacher_subject_preparations (
                teacher_id,
                subject_id,
                preparation_id
            ) VALUES (
                :teacher_id,
                :subject_id,
                :preparation_id
            )
        ");

        foreach ($preparationPairs as $pair) {
            $insertPreparationStmt->execute([
                'teacher_id' => $user['id'],
                'subject_id' => $pair['subject_id'],
                'preparation_id' => $pair['preparation_id'],
            ]);
        }
    }

    $deleteAgeGroupsStmt = $pdo->prepare("
        DELETE FROM teacher_age_groups
        WHERE teacher_id = :teacher_id
    ");
    $deleteAgeGroupsStmt->execute(['teacher_id' => $user['id']]);

    $insertAgeGroupStmt = $pdo->prepare("
        INSERT INTO teacher_age_groups (teacher_id, age_group_id)
        VALUES (:teacher_id, :age_group_id)
    ");

    foreach ($ageGroupIds as $ageGroupId) {
        $insertAgeGroupStmt->execute([
            'teacher_id' => $user['id'],
            'age_group_id' => $ageGroupId,
        ]);
    }

    $updateEducationStmt = $pdo->prepare("
        UPDATE teacher_education
        SET
            institution = :institution,
            faculty = :faculty,
            speciality = :speciality,
            qualification = :qualification,
            graduation_year = :graduation_year,
            description = :description,
            is_primary = :is_primary,
            sort_order = :sort_order,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
          AND teacher_id = :teacher_id
    ");

    $insertEducationStmt = $pdo->prepare("
        INSERT INTO teacher_education (
            teacher_id,
            institution,
            faculty,
            speciality,
            qualification,
            graduation_year,
            description,
            is_primary,
            sort_order
        ) VALUES (
            :teacher_id,
            :institution,
            :faculty,
            :speciality,
            :qualification,
            :graduation_year,
            :description,
            :is_primary,
            :sort_order
        )
    ");

    $retainedEducationIds = [];

    foreach ($education as $item) {
        $educationParams = [
            'teacher_id' => $user['id'],
            'institution' => $item['institution'],
            'faculty' => $item['faculty'],
            'speciality' => $item['speciality'],
            'qualification' => $item['qualification'],
            'graduation_year' => $item['graduation_year'],
            'description' => $item['description'],
            'is_primary' => (int) $item['is_primary'],
            'sort_order' => $item['sort_order'],
        ];

        if ($item['id'] !== null) {
            $updateEducationStmt->execute([
                ...$educationParams,
                'id' => $item['id'],
            ]);
            $retainedEducationIds[] = $item['id'];
            continue;
        }

        $insertEducationStmt->execute($educationParams);
        $retainedEducationIds[] = (int) $pdo->lastInsertId();
    }

    $retainedPlaceholders = implode(',', array_fill(0, count($retainedEducationIds), '?'));
    $deleteEducationStmt = $pdo->prepare("
        DELETE FROM teacher_education
        WHERE teacher_id = ?
          AND id NOT IN ($retainedPlaceholders)
    ");
    $deleteEducationStmt->execute([
        $user['id'],
        ...$retainedEducationIds,
    ]);

    $userStmt = $pdo->prepare("
        UPDATE users
        SET
            full_name = :full_name,
            profile_completed = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ");
    $userStmt->execute([
        'full_name' => $fullName,
        'id' => $user['id'],
    ]);

    $profileSelectStmt = $pdo->prepare("
        SELECT *
        FROM teacher_profiles
        WHERE user_id = :user_id
        LIMIT 1
    ");
    $profileSelectStmt->execute(['user_id' => $user['id']]);
    $savedProfile = $profileSelectStmt->fetch(PDO::FETCH_ASSOC);

    $pdo->commit();

    successResponse([
        'message' => 'Анкета преподавателя сохранена и отправлена на проверку',
        'user' => [
            ...$user,
            'full_name' => $fullName,
            'profile_completed' => true,
        ],
        'profile' => $savedProfile,
        'subject_ids' => $subjectIds,
        'subject_preparations' => array_values($normalizedSubjectPreparations),
        'age_group_ids' => $ageGroupIds,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('update-teacher.php: ' . $error->getMessage());
    errorResponse('Ошибка сохранения анкеты преподавателя', 500);
}
