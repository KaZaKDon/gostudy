<?php

declare(strict_types=1);

function adminJsonResponse(
    array $data,
    int $statusCode = 200
): never {
    http_response_code($statusCode);

    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_INVALID_UTF8_SUBSTITUTE
    );

    exit;
}

function adminSuccessResponse(
    array $data = [],
    string $message = '',
    int $statusCode = 200
): never {
    $response = [
        'success' => true,
    ];

    if ($message !== '') {
        $response['message'] = $message;
    }

    if ($data !== []) {
        $response['data'] = $data;
    }

    adminJsonResponse($response, $statusCode);
}

function adminErrorResponse(
    string $message,
    int $statusCode = 400,
    array $data = []
): never {
    $response = [
        'success' => false,
        'message' => $message,
    ];

    if ($data !== []) {
        $response['data'] = $data;
    }

    adminJsonResponse($response, $statusCode);
}

function adminNotFoundResponse(
    string $message = 'Запись не найдена'
): never {
    adminErrorResponse($message, 404);
}

function adminConflictResponse(
    string $message
): never {
    adminErrorResponse($message, 409);
}

function adminServerErrorResponse(
    string $message = 'Внутренняя ошибка сервера'
): never {
    adminErrorResponse($message, 500);
}