<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'student') {
    errorResponse('Поиск преподавателей доступен только ученику', 403);
}

$search = trim((string) ($_GET['search'] ?? ''));
$page = max(1, (int) ($_GET['page'] ?? 1));

$limit = 12;
$offset = ($page - 1) * $limit;

try {
    $pdo = getDatabaseConnection();

    $where = [
        "users.role = 'teacher'",
        "users.status = 'active'",
        "teacher_profiles.is_visible = 1",
        "teacher_profiles.verification_status = 'approved'",
    ];

    $searchParams = [];

    if ($search !== '') {
        $where[] = "(
            teacher_profiles.first_name LIKE :search_first_name
            OR teacher_profiles.last_name LIKE :search_last_name
            OR teacher_profiles.headline LIKE :search_headline
            OR teacher_profiles.city LIKE :search_city
            OR subjects.name LIKE :search_subject
        )";

        $searchValue = '%' . $search . '%';

        $searchParams = [
            'search_first_name' => $searchValue,
            'search_last_name' => $searchValue,
            'search_headline' => $searchValue,
            'search_city' => $searchValue,
            'search_subject' => $searchValue,
        ];
    }

    $whereSql = implode(' AND ', $where);

    /*
     * Считаем общее число преподавателей.
     */
    $countStmt = $pdo->prepare("
        SELECT
            COUNT(DISTINCT teacher_profiles.user_id)

        FROM teacher_profiles

        INNER JOIN users
            ON users.id = teacher_profiles.user_id

        LEFT JOIN teacher_subjects
            ON teacher_subjects.teacher_id = teacher_profiles.user_id

        LEFT JOIN subjects
            ON subjects.id = teacher_subjects.subject_id

        WHERE {$whereSql}
    ");

    foreach ($searchParams as $name => $value) {
        $countStmt->bindValue(
            ':' . $name,
            $value,
            PDO::PARAM_STR
        );
    }

    $countStmt->execute();

    $total = (int) $countStmt->fetchColumn();

    /*
     * Загружаем короткие карточки преподавателей.
     */
    $stmt = $pdo->prepare("
        SELECT
            teacher_profiles.user_id AS teacher_id,
            teacher_profiles.first_name,
            teacher_profiles.last_name,
            teacher_profiles.slug,
            teacher_profiles.photo_url,
            teacher_profiles.city,
            teacher_profiles.headline,
            teacher_profiles.experience_years,
            teacher_profiles.rating,
            teacher_profiles.reviews_count,
            teacher_profiles.is_verified,
            teacher_profiles.accessibility_enabled,

            LEAST(
                COALESCE(NULLIF(teacher_profiles.price_45, 0), 999999999),
                COALESCE(NULLIF(teacher_profiles.price_60, 0), 999999999),
                COALESCE(NULLIF(teacher_profiles.price_90, 0), 999999999),
                COALESCE(NULLIF(teacher_profiles.price_per_lesson, 0), 999999999),
                COALESCE(NULLIF(teacher_profiles.price_per_hour, 0), 999999999)
            ) AS calculated_price_from,

            GROUP_CONCAT(
                DISTINCT subjects.name
                ORDER BY subjects.name
                SEPARATOR '||'
            ) AS subjects

        FROM teacher_profiles

        INNER JOIN users
            ON users.id = teacher_profiles.user_id

        LEFT JOIN teacher_subjects
            ON teacher_subjects.teacher_id = teacher_profiles.user_id

        LEFT JOIN subjects
            ON subjects.id = teacher_subjects.subject_id

        WHERE {$whereSql}

        GROUP BY
            teacher_profiles.user_id,
            teacher_profiles.first_name,
            teacher_profiles.last_name,
            teacher_profiles.slug,
            teacher_profiles.photo_url,
            teacher_profiles.city,
            teacher_profiles.headline,
            teacher_profiles.experience_years,
            teacher_profiles.rating,
            teacher_profiles.reviews_count,
            teacher_profiles.is_verified,
            teacher_profiles.accessibility_enabled,
            teacher_profiles.price_45,
            teacher_profiles.price_60,
            teacher_profiles.price_90,
            teacher_profiles.price_per_lesson,
            teacher_profiles.price_per_hour,
            teacher_profiles.created_at

        ORDER BY
            teacher_profiles.rating DESC,
            teacher_profiles.reviews_count DESC,
            teacher_profiles.created_at DESC

        LIMIT :limit
        OFFSET :offset
    ");

    foreach ($searchParams as $name => $value) {
        $stmt->bindValue(
            ':' . $name,
            $value,
            PDO::PARAM_STR
        );
    }

    $stmt->bindValue(
        ':limit',
        $limit,
        PDO::PARAM_INT
    );

    $stmt->bindValue(
        ':offset',
        $offset,
        PDO::PARAM_INT
    );

    $stmt->execute();

    $rows = $stmt->fetchAll();

    $teachers = array_map(
        static function (array $teacher): array {
            $calculatedPrice = $teacher['calculated_price_from'];

            $priceFrom =
                $calculatedPrice !== null
                && (float) $calculatedPrice < 999999999
                    ? (float) $calculatedPrice
                    : null;

            return [
                'teacher_id' => (int) $teacher['teacher_id'],

                'first_name' =>
                    $teacher['first_name'],

                'last_name' =>
                    $teacher['last_name'],

                'name' => trim(
                    (string) ($teacher['first_name'] ?? '')
                    . ' '
                    . (string) ($teacher['last_name'] ?? '')
                ),

                'slug' =>
                    $teacher['slug'],

                'photo_url' =>
                    $teacher['photo_url'],

                'city' =>
                    $teacher['city'],

                'headline' =>
                    $teacher['headline'],

                'experience_years' =>
                    $teacher['experience_years'] !== null
                        ? (int) $teacher['experience_years']
                        : null,

                'rating' =>
                    (float) $teacher['rating'],

                'reviews_count' =>
                    (int) $teacher['reviews_count'],

                'is_verified' =>
                    (bool) $teacher['is_verified'],

                'accessibility_enabled' =>
                    (bool) $teacher['accessibility_enabled'],

                'price_from' =>
                    $priceFrom,

                'subjects' =>
                    !empty($teacher['subjects'])
                        ? explode('||', $teacher['subjects'])
                        : [],
            ];
        },
        $rows
    );

    successResponse([
        'teachers' => $teachers,

        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' =>
                $total > 0
                    ? (int) ceil($total / $limit)
                    : 0,
        ],
    ]);
    } catch (Throwable $error) {
        error_log(
            'find-teachers.php: '
            . $error->getMessage()
        );
    
        errorResponse(
            'Не удалось загрузить список преподавателей',
            500
        );
    }