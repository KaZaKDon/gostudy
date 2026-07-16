<?php

declare(strict_types=1);

require_once __DIR__ . '/response.php';

function requireAdminPositiveId(
    mixed $value,
    string $fieldName = 'id'
): int {
    if (
        filter_var(
            $value,
            FILTER_VALIDATE_INT
        ) === false
    ) {
        adminErrorResponse(
            "Поле «{$fieldName}» должно быть целым числом",
            400
        );
    }

    $id = (int) $value;

    if ($id <= 0) {
        adminErrorResponse(
            "Поле «{$fieldName}» должно быть больше нуля",
            400
        );
    }

    return $id;
}

function requireAdminName(
    mixed $value,
    string $fieldName = 'Название',
    int $maxLength = 150
): string {
    $name = trim((string) $value);

    if ($name === '') {
        adminErrorResponse(
            "Укажите поле «{$fieldName}»",
            400
        );
    }

    if (mb_strlen($name) > $maxLength) {
        adminErrorResponse(
            "Поле «{$fieldName}» не должно превышать {$maxLength} символов",
            400
        );
    }

    return $name;
}

function requireAdminSlug(
    mixed $value,
    string $fieldName = 'slug',
    int $maxLength = 150
): string {
    $slug = trim((string) $value);

    if ($slug === '') {
        adminErrorResponse(
            "Укажите поле «{$fieldName}»",
            400
        );
    }

    if (mb_strlen($slug) > $maxLength) {
        adminErrorResponse(
            "Поле «{$fieldName}» не должно превышать {$maxLength} символов",
            400
        );
    }

    if (
        preg_match(
            '/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            $slug
        ) !== 1
    ) {
        adminErrorResponse(
            "Поле «{$fieldName}» может содержать только строчные латинские буквы, цифры и дефисы",
            400
        );
    }

    return $slug;
}

function getAdminSortOrder(
    mixed $value,
    int $default = 0
): int {
    if ($value === null || $value === '') {
        return $default;
    }

    if (
        filter_var(
            $value,
            FILTER_VALIDATE_INT
        ) === false
    ) {
        adminErrorResponse(
            'Порядок вывода должен быть целым числом',
            400
        );
    }

    $sortOrder = (int) $value;

    if ($sortOrder < 0) {
        adminErrorResponse(
            'Порядок вывода не может быть отрицательным',
            400
        );
    }

    return $sortOrder;
}

function getAdminBoolean(
    mixed $value,
    bool $default = false
): bool {
    if ($value === null || $value === '') {
        return $default;
    }

    if (is_bool($value)) {
        return $value;
    }

    if ($value === 1 || $value === '1') {
        return true;
    }

    if ($value === 0 || $value === '0') {
        return false;
    }

    $boolean = filter_var(
        $value,
        FILTER_VALIDATE_BOOLEAN,
        FILTER_NULL_ON_FAILURE
    );

    if ($boolean === null) {
        adminErrorResponse(
            'Передано некорректное логическое значение',
            400
        );
    }

    return $boolean;
}