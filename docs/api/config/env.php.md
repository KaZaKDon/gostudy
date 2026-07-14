<?php

declare(strict_types=1);

if (!function_exists('env')) {

    /**
     * Возвращает значение переменной окружения из файла .env
     */
    function env(string $key, ?string $default = null): ?string
    {
        static $variables = null;

        if ($variables === null) {

            $variables = [];

            $envFile = dirname(__DIR__, 2) . '/.env';

            if (is_file($envFile)) {

                $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

                foreach ($lines as $line) {

                    $line = trim($line);

                    if ($line === '' || str_starts_with($line, '#')) {
                        continue;
                    }

                    if (!str_contains($line, '=')) {
                        continue;
                    }

                    [$name, $value] = explode('=', $line, 2);

                    $variables[trim($name)] = trim($value);
                }
            }
        }

        return $variables[$key] ?? $default;
    }

}