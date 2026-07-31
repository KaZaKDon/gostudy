<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/response.php';

function uploadEnvPath(string $key): string
{
    $path = rtrim(trim((string) env($key, '')), DIRECTORY_SEPARATOR);

    if ($path === '' || !str_starts_with($path, DIRECTORY_SEPARATOR)) {
        throw new RuntimeException('Не настроен абсолютный путь ' . $key);
    }

    return $path;
}

function uploadPublicRoot(): string
{
    return uploadEnvPath('UPLOAD_PUBLIC_DIR');
}

function uploadPrivateRoot(): string
{
    return uploadEnvPath('UPLOAD_PRIVATE_DIR');
}

function uploadPublicUrl(): string
{
    $url = rtrim(trim((string) env('UPLOAD_PUBLIC_URL', '/uploads')), '/');

    if ($url === '' || (!str_starts_with($url, '/') && filter_var($url, FILTER_VALIDATE_URL) === false)) {
        throw new RuntimeException('Некорректно настроен UPLOAD_PUBLIC_URL');
    }

    return $url;
}

function uploadMaxBytes(string $key, int $default): int
{
    $value = filter_var(env($key, (string) $default), FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
    ]);

    return $value !== false ? (int) $value : $default;
}

function phpIniBytes(string $value): int
{
    $value = trim($value);

    if ($value === '') {
        return PHP_INT_MAX;
    }

    $unit = strtolower(substr($value, -1));
    $number = (float) $value;

    $bytes = match ($unit) {
        'g' => (int) ($number * 1024 * 1024 * 1024),
        'm' => (int) ($number * 1024 * 1024),
        'k' => (int) ($number * 1024),
        default => (int) $number,
    };

    return $bytes > 0 ? $bytes : PHP_INT_MAX;
}

function effectiveUploadMaxBytes(string $key, int $default): int
{
    return min(
        uploadMaxBytes($key, $default),
        phpIniBytes((string) ini_get('upload_max_filesize')),
        phpIniBytes((string) ini_get('post_max_size'))
    );
}

function uploadErrorMessage(int $error): string
{
    return match ($error) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE =>
            'Файл превышает разрешённый размер',
        UPLOAD_ERR_PARTIAL =>
            'Файл загрузился не полностью',
        UPLOAD_ERR_NO_FILE =>
            'Файл не выбран',
        UPLOAD_ERR_NO_TMP_DIR =>
            'На сервере не настроена временная папка',
        UPLOAD_ERR_CANT_WRITE =>
            'Сервер не смог сохранить файл',
        UPLOAD_ERR_EXTENSION =>
            'Загрузка остановлена расширением PHP',
        default =>
            'Не удалось загрузить файл',
    };
}

function receiveUploadedFile(
    string $field,
    int $maxBytes,
    array $allowedMimeTypes
): array {
    if (!isset($_FILES[$field]) || !is_array($_FILES[$field])) {
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);

        if ($contentLength > 0) {
            errorResponse(
                'Сервер не получил файл. Проверьте post_max_size и upload_max_filesize',
                413
            );
        }

        errorResponse('Файл не выбран');
    }

    $file = $_FILES[$field];
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error !== UPLOAD_ERR_OK) {
        errorResponse(uploadErrorMessage($error), 413);
    }

    $tmpName = (string) ($file['tmp_name'] ?? '');
    $size = (int) ($file['size'] ?? 0);

    if ($tmpName === '' || !is_uploaded_file($tmpName)) {
        errorResponse('Сервер не распознал загруженный файл');
    }

    if ($size < 1 || $size > $maxBytes) {
        errorResponse('Файл превышает разрешённый размер', 413);
    }

    if (class_exists('finfo')) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = (string) $finfo->file($tmpName);
    } elseif (function_exists('mime_content_type')) {
        $mimeType = (string) mime_content_type($tmpName);
    } else {
        throw new RuntimeException('На сервере не установлено расширение fileinfo');
    }

    if (!isset($allowedMimeTypes[$mimeType])) {
        errorResponse('Формат файла не поддерживается');
    }

    $originalName = trim((string) ($file['name'] ?? 'file'));
    $originalName = mb_substr(basename(str_replace('\\', '/', $originalName)), 0, 255);

    return [
        'tmp_name' => $tmpName,
        'size' => $size,
        'mime_type' => $mimeType,
        'extension' => $allowedMimeTypes[$mimeType],
        'original_name' => $originalName !== '' ? $originalName : 'file',
    ];
}

function ensureUploadDirectory(string $directory, int $permissions): void
{
    if (is_dir($directory)) {
        return;
    }

    if (!mkdir($directory, $permissions, true) && !is_dir($directory)) {
        throw new RuntimeException('Не удалось создать папку загрузки');
    }
}

function storeUploadedFile(
    array $file,
    string $root,
    string $relativeDirectory,
    int $directoryPermissions = 0750,
    int $filePermissions = 0640
): string {
    $relativeDirectory = trim(str_replace('\\', '/', $relativeDirectory), '/');

    if ($relativeDirectory === '' || str_contains($relativeDirectory, '..')) {
        throw new RuntimeException('Некорректная папка загрузки');
    }

    $directory = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeDirectory);
    ensureUploadDirectory($directory, $directoryPermissions);

    $fileName = bin2hex(random_bytes(24)) . '.' . $file['extension'];
    $relativePath = $relativeDirectory . '/' . $fileName;
    $targetPath = $directory . DIRECTORY_SEPARATOR . $fileName;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new RuntimeException('Не удалось сохранить загруженный файл');
    }

    @chmod($targetPath, $filePermissions);

    return $relativePath;
}

function safeStoredPath(string $root, string $relativePath): ?string
{
    $relativePath = ltrim(str_replace('\\', '/', trim($relativePath)), '/');

    if ($relativePath === '' || str_contains($relativePath, '..')) {
        return null;
    }

    $path = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
    $realRoot = realpath($root);
    $realPath = realpath($path);

    if ($realRoot === false || $realPath === false) {
        return null;
    }

    $rootPrefix = rtrim($realRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

    return str_starts_with($realPath, $rootPrefix) ? $realPath : null;
}

function deleteStoredFile(string $root, string $relativePath): void
{
    $path = safeStoredPath($root, $relativePath);

    if ($path !== null && is_file($path)) {
        @unlink($path);
    }
}

function publicUrlFromStoredPath(string $relativePath): string
{
    return uploadPublicUrl() . '/' . ltrim($relativePath, '/');
}

function storedPathFromPublicUrl(?string $url): ?string
{
    if ($url === null || $url === '') {
        return null;
    }

    $baseUrl = uploadPublicUrl() . '/';

    if (!str_starts_with($url, $baseUrl)) {
        return null;
    }

    $relativePath = substr($url, strlen($baseUrl));

    return $relativePath !== '' && !str_contains($relativePath, '..')
        ? $relativePath
        : null;
}
