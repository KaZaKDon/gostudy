<?php

declare(strict_types=1);

require_once __DIR__ . '/response.php';

function requireAdminRequestMethod(
    string|array $allowedMethods
): void {
    $allowedMethods = (array) $allowedMethods;

    $allowedMethods = array_map(
        static fn (string $method): string => strtoupper($method),
        $allowedMethods
    );

    $requestMethod = strtoupper(
        (string) ($_SERVER['REQUEST_METHOD'] ?? '')
    );

    if (!in_array($requestMethod, $allowedMethods, true)) {
        header(
            'Allow: ' . implode(', ', $allowedMethods)
        );

        adminErrorResponse(
            'Метод не поддерживается',
            405
        );
    }
}

function getAdminJsonInput(): array
{
    $rawBody = file_get_contents('php://input');

    if ($rawBody === false || trim($rawBody) === '') {
        adminErrorResponse(
            'Тело запроса не передано',
            400
        );
    }

    try {
        $data = json_decode(
            $rawBody,
            true,
            512,
            JSON_THROW_ON_ERROR
        );
    } catch (JsonException) {
        adminErrorResponse(
            'Передан некорректный JSON',
            400
        );
    }

    if (!is_array($data)) {
        adminErrorResponse(
            'JSON должен содержать объект',
            400
        );
    }

    return $data;
}

function getAdminQueryString(
    string $name,
    string $default = ''
): string {
    return trim(
        (string) ($_GET[$name] ?? $default)
    );
}

function getAdminQueryInt(
    string $name,
    int $default = 0
): int {
    $value = $_GET[$name] ?? null;

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
            "Параметр «{$name}» должен быть целым числом",
            400
        );
    }

    return (int) $value;
}

function getAdminQueryBool(
    string $name,
    ?bool $default = null
): ?bool {
    if (!array_key_exists($name, $_GET)) {
        return $default;
    }

    $value = filter_var(
        $_GET[$name],
        FILTER_VALIDATE_BOOLEAN,
        FILTER_NULL_ON_FAILURE
    );

    if ($value === null) {
        adminErrorResponse(
            "Параметр «{$name}» должен содержать логическое значение",
            400
        );
    }

    return $value;
}