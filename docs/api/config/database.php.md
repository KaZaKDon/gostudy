<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

function getDatabaseConnection(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = trim((string) env('DB_HOST', 'localhost'));
    $port = trim((string) env('DB_PORT', '3306'));
    $database = trim((string) env('DB_NAME', ''));
    $username = trim((string) env('DB_USERNAME', ''));
    $password = (string) env('DB_PASSWORD', '');

    if ($host === '') {
        throw new RuntimeException(
            'Не указан DB_HOST в файле .env'
        );
    }

    if ($port === '' || !ctype_digit($port)) {
        throw new RuntimeException(
            'Некорректный DB_PORT в файле .env'
        );
    }

    if ($database === '') {
        throw new RuntimeException(
            'Не указан DB_NAME в файле .env'
        );
    }

    if ($username === '') {
        throw new RuntimeException(
            'Не указан DB_USERNAME в файле .env'
        );
    }

    if ($password === '') {
        throw new RuntimeException(
            'Не указан DB_PASSWORD в файле .env'
        );
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $host,
        $port,
        $database
    );

    $pdo = new PDO(
        $dsn,
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    return $pdo;
}
