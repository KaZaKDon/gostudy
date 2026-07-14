<?php

declare(strict_types=1);

require_once __DIR__ . '/response.php';
require_once __DIR__ . '/../config/database.php';

function getAuthorizationHeader(): string
    {
        $keys = [
            'HTTP_AUTHORIZATION',
            'REDIRECT_HTTP_AUTHORIZATION',
            'HTTP_X_AUTHORIZATION',
            'HTTP_X_AUTH_TOKEN',
        ];
    
        foreach ($keys as $key) {
            if (!empty($_SERVER[$key])) {
                return trim((string) $_SERVER[$key]);
            }
        }
    
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
    
            foreach ($headers as $name => $value) {
                $lowerName = mb_strtolower($name);
    
                if (
                    $lowerName === 'authorization'
                    || $lowerName === 'x-authorization'
                    || $lowerName === 'x-auth-token'
                ) {
                    return trim((string) $value);
                }
            }
        }
    
        return '';
    }

function getBearerToken(): string
{
    $header = getAuthorizationHeader();

    if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return trim($matches[1]);
    }

    if (preg_match('/^[a-f0-9]{64}$/i', $header)) {
        return trim($header);
    }

    errorResponse('Требуется авторизация', 401);
}

function requireAuth(): array
{
    $token = getBearerToken();
    $tokenHash = hash('sha256', $token);

    try {
        $pdo = getDatabaseConnection();

        $stmt = $pdo->prepare("
            SELECT
                users.id,
                users.role,
                users.email,
                users.full_name,
                users.phone,
                users.avatar_url,
                users.status,
                users.email_verified_at,
                users.profile_completed,
                auth_tokens.id AS token_id,
                auth_tokens.expires_at
            FROM auth_tokens
            INNER JOIN users ON users.id = auth_tokens.user_id
            WHERE auth_tokens.token_hash = :token_hash
            LIMIT 1
        ");

        $stmt->execute([
            'token_hash' => $tokenHash,
        ]);

        $user = $stmt->fetch();

        if (!$user) {
            errorResponse('Сессия недействительна', 401);
        }

        if (strtotime((string) $user['expires_at']) < time()) {
            errorResponse('Сессия истекла', 401);
        }

        if ($user['status'] !== 'active') {
            errorResponse('Аккаунт недоступен', 403);
        }

        if ($user['email_verified_at'] === null) {
            errorResponse('Подтвердите электронную почту', 403);
        }

        $updateStmt = $pdo->prepare("
            UPDATE auth_tokens
            SET last_used_at = NOW()
            WHERE id = :id
        ");

        $updateStmt->execute([
            'id' => (int) $user['token_id'],
        ]);

        return [
            'id' => (int) $user['id'],
            'role' => $user['role'],
            'email' => $user['email'],
            'full_name' => $user['full_name'],
            'phone' => $user['phone'],
            'avatar_url' => $user['avatar_url'],
            'status' => $user['status'],
            'email_verified' => true,
            'profile_completed' => (bool) $user['profile_completed'],
        ];
    } catch (Throwable $error) {
        errorResponse('Ошибка авторизации', 500);
    }
}