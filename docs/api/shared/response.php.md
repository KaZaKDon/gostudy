<?php

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);

    header('Content-Type: application/json; charset=utf-8');

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}

function successResponse(array $data = []): void
{
    jsonResponse([
        'success' => true,
        ...$data,
    ]);
}

function errorResponse(
    string $message,
    int $status = 400
): void {
    jsonResponse([
        'success' => false,
        'message' => $message,
    ], $status);
}