# 11_AUTH_CODE.md — GoStudy Auth и Email

Документ фиксирует **финальные версии кода**, написанные в чате для регистрации, подтверждения email, повторной отправки письма и входа.

---

# 1. Структура файлов

```text
api/
├── auth/
│   ├── register.php
│   ├── login.php
│   ├── verify-email.php
│   └── resend-verification.php
│
├── config/
│   ├── app.php
│   ├── auth.php
│   ├── env.php
│   ├── mail.php
│   └── database.php
│
├── mail/
│   ├── MailService.php
│   └── templates/
│       ├── layout.php
│       └── verification.php
│
└── shared/
    ├── cors.php
    ├── json.php
    └── response.php

src/
├── api/
│   └── api.js
│
└── pages/
    ├── Login/
    │   └── Login.jsx
    │
    └── VerifyEmail/
        ├── VerifyEmail.jsx
        └── VerifyEmail.css
```

---

# 2. SQL-поля users

Поля, которые используются модулем Auth:

```sql
email_verified_at DATETIME NULL
profile_completed TINYINT(1) NOT NULL DEFAULT 0
email_verification_token VARCHAR(128) NULL
email_verification_expires_at DATETIME NULL
email_verification_sent_at DATETIME NULL
```

Если нужно добавить `profile_completed`:

```sql
ALTER TABLE users
ADD COLUMN profile_completed TINYINT(1) NOT NULL DEFAULT 0 AFTER email_verified_at;
```

Если нужно разрешить пустые ФИО и телефон при минимальной регистрации:

```sql
ALTER TABLE users
MODIFY full_name VARCHAR(255) NULL,
MODIFY phone VARCHAR(50) NULL;
```

---

# 3. `api/config/app.php`

```php
<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | GoStudy
    |--------------------------------------------------------------------------
    */

    'name' => 'GoStudy',

    'url' => 'https://gostudyonline.ru',

    'support_email' => 'support@gostudyonline.ru',

    'timezone' => 'Europe/Moscow',

    'locale' => 'ru',

];
```

---

# 4. `api/config/auth.php`

```php
<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Подтверждение электронной почты
    |--------------------------------------------------------------------------
    */

    // Срок действия ссылки подтверждения: 24 часа.
    'verification_lifetime' => 60 * 60 * 24,

    // Минимальный интервал между повторными отправками: 60 секунд.
    'verification_resend_interval' => 60,

];
```

---

# 5. `api/config/env.php`

```php
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
```

---

# 6. `api/config/mail.php`

```php
<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

return [

    /*
    |--------------------------------------------------------------------------
    | SMTP
    |--------------------------------------------------------------------------
    */

    'host' => env('MAIL_HOST', ''),
    'port' => (int) env('MAIL_PORT', '465'),

    'encryption' => env('MAIL_ENCRYPTION', 'ssl'),

    'username' => env('MAIL_USERNAME', ''),
    'password' => env('MAIL_PASSWORD', ''),

    /*
    |--------------------------------------------------------------------------
    | Отправитель
    |--------------------------------------------------------------------------
    */

    'from_email' => env('MAIL_FROM_ADDRESS', ''),
    'from_name'  => env('MAIL_FROM_NAME', 'GoStudy'),

];
```

---

# 7. `.env`

```env
MAIL_HOST=mail.gostudyonline.ru
MAIL_PORT=465
MAIL_ENCRYPTION=ssl

MAIL_USERNAME=noreply@gostudyonline.ru
MAIL_PASSWORD=********

MAIL_FROM_ADDRESS=noreply@gostudyonline.ru
MAIL_FROM_NAME=GoStudy
```

Пароль в документации не хранится. В рабочем `.env` должен быть настоящий пароль.

---

# 8. `api/mail/MailService.php`

```php
<?php

declare(strict_types=1);

namespace GoStudy\Mail;

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/../lib/PHPMailer/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/SMTP.php';

final class MailService
{
    private array $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config/mail.php';
    }

    public function send(string $to, string $subject, string $html, string $text = ''): bool
    {
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();

            $mail->Host = $this->config['host'];
            $mail->SMTPAuth = true;

            $mail->Username = $this->config['username'];
            $mail->Password = $this->config['password'];

            $mail->SMTPSecure = $this->config['encryption'];
            $mail->Port = $this->config['port'];

            $mail->CharSet = 'UTF-8';

            $mail->setFrom(
                $this->config['from_email'],
                $this->config['from_name']
            );

            $mail->addAddress($to);

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $html;
            $mail->AltBody = $text !== '' ? $text : strip_tags($html);

            return $mail->send();
        } catch (Exception $e) {
            error_log('GoStudy mail error: ' . $mail->ErrorInfo);
            return false;
        }
    }

    public function sendVerificationEmail(
        string $to,
        string $fullName,
        string $verificationUrl
    ): bool {
        require_once __DIR__ . '/templates/verification.php';

        $html = gostudyVerificationTemplate($fullName, $verificationUrl);

        return $this->send(
            $to,
            'Подтверждение электронной почты — GoStudy',
            $html,
            'Здравствуйте! Для завершения регистрации подтвердите электронную почту: ' . $verificationUrl
        );
    }
}
```

---

# 9. `api/mail/templates/layout.php`

```php
<?php

declare(strict_types=1);

function gostudyMailLayout(string $title, string $content): string
{
    return '
<!doctype html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</title>
</head>
<body style="margin:0;padding:0;background:#f6ecd8;font-family:Arial,sans-serif;color:#2f2117;">
    <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
        <div style="background:#fff8eb;border:1px solid #e1cfad;border-radius:18px;padding:28px;">
            <h1 style="margin:0 0 16px;font-size:24px;color:#5a341d;">GoStudy</h1>
            ' . $content . '
            <hr style="border:none;border-top:1px solid #e1cfad;margin:28px 0 16px;">
            <p style="margin:0;font-size:13px;color:#6f5a43;">
                Это автоматическое письмо. Если у вас возникли вопросы, напишите нам:
                support@gostudyonline.ru
            </p>
        </div>
    </div>
</body>
</html>';
}
```

---

# 10. `api/mail/templates/verification.php`

```php
<?php

declare(strict_types=1);

require_once __DIR__ . '/layout.php';

function gostudyVerificationTemplate(
    string $fullName,
    string $verificationUrl
): string {

    $content = '

<p style="font-size:16px;">
Здравствуйте, <strong>' . htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8') . '</strong>!
</p>

<p style="font-size:15px;line-height:1.7;">
Спасибо за регистрацию на платформе <strong>GoStudy</strong>.
</p>

<p style="font-size:15px;line-height:1.7;">
Для завершения регистрации необходимо подтвердить адрес электронной почты.
</p>

<p style="margin:32px 0;text-align:center;">

<a
href="' . htmlspecialchars($verificationUrl, ENT_QUOTES, 'UTF-8') . '"
style="
display:inline-block;
padding:14px 28px;
background:#6f8f33;
color:#ffffff;
text-decoration:none;
border-radius:10px;
font-weight:bold;
">

Подтвердить электронную почту

</a>

</p>

<p style="font-size:14px;color:#6f5a43;line-height:1.6;">
Если кнопка не работает, скопируйте ссылку ниже в браузер:
</p>

<p style="word-break:break-all;font-size:13px;">
' . htmlspecialchars($verificationUrl, ENT_QUOTES, 'UTF-8') . '
</p>

<p style="margin-top:30px;font-size:14px;color:#6f5a43;">
Если вы не регистрировались на GoStudy, просто проигнорируйте это письмо.
</p>

';

    return gostudyMailLayout(
        'Подтверждение электронной почты',
        $content
    );

}
```

---

# 11. `api/shared/response.php`

```php
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

function errorResponse(string $message, int $status = 400): void
{
    jsonResponse([
        'success' => false,
        'message' => $message,
    ], $status);
}
```

---

# 12. `api/shared/json.php`

```php
<?php

function getJsonInput(): array
{
    $input = file_get_contents('php://input');

    if (!$input) {
        return [];
    }

    $decoded = json_decode($input, true);

    return is_array($decoded)
        ? $decoded
        : [];
}
```

---

# 13. `api/shared/cors.php`

```php
<?php

$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://gostudyonline.ru',
];

$origin = trim($_SERVER['HTTP_ORIGIN'] ?? '');

if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true);
    header('Vary: Origin');
}

header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
```

---

# 14. `api/auth/register.php`

```php
<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../mail/MailService.php';

use GoStudy\Mail\MailService;

$appConfig = require __DIR__ . '/../config/app.php';
$authConfig = require __DIR__ . '/../config/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$data = getJsonInput();

$role = trim($data['role'] ?? '');
$email = mb_strtolower(trim($data['email'] ?? ''));
$password = (string) ($data['password'] ?? '');

if (!in_array($role, ['student', 'teacher'], true)) {
    errorResponse('Некорректная роль пользователя');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Некорректный email');
}

if (mb_strlen($password) < 6) {
    errorResponse('Пароль должен быть не короче 6 символов');
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);

    if ($stmt->fetch()) {
        errorResponse('Пользователь с таким email уже существует', 409);
    }

    $pdo->beginTransaction();

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $verificationToken = bin2hex(random_bytes(32));
    $verificationExpiresAt = date(
        'Y-m-d H:i:s',
        time() + (int) $authConfig['verification_lifetime']
    );
    $verificationSentAt = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        INSERT INTO users (
            role,
            email,
            password_hash,
            full_name,
            phone,
            status,
            email_verified_at,
            profile_completed,
            email_verification_token,
            email_verification_expires_at,
            email_verification_sent_at
        )
        VALUES (
            :role,
            :email,
            :password_hash,
            NULL,
            NULL,
            'active',
            NULL,
            0,
            :email_verification_token,
            :email_verification_expires_at,
            :email_verification_sent_at
        )
    ");

    $stmt->execute([
        'role' => $role,
        'email' => $email,
        'password_hash' => $passwordHash,
        'email_verification_token' => $verificationToken,
        'email_verification_expires_at' => $verificationExpiresAt,
        'email_verification_sent_at' => $verificationSentAt,
    ]);

    $userId = (int) $pdo->lastInsertId();

    if ($role === 'student') {
        $stmt = $pdo->prepare("
            INSERT INTO student_profiles (user_id)
            VALUES (:user_id)
        ");
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO teacher_profiles (user_id)
            VALUES (:user_id)
        ");
    }

    $stmt->execute(['user_id' => $userId]);

    $pdo->commit();

    $verificationUrl =
        $appConfig['url']
        . '/verify-email?token='
        . urlencode($verificationToken);

    $mailService = new MailService();

    $mailSent = $mailService->sendVerificationEmail(
        $email,
        'пользователь GoStudy',
        $verificationUrl
    );

    successResponse([
        'message' => $mailSent
            ? 'Регистрация выполнена. Мы отправили письмо для подтверждения email.'
            : 'Регистрация выполнена, но письмо подтверждения не удалось отправить.',
        'email_verification_required' => true,
        'mail_sent' => $mailSent,
        'user' => [
            'id' => $userId,
            'role' => $role,
            'email' => $email,
            'status' => 'active',
            'email_verified_at' => null,
            'profile_completed' => false,
        ],
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Ошибка регистрации', 500);
}
```

---

# 15. `api/auth/verify-email.php`

```php
<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Метод не поддерживается', 405);
}

$token = trim($_GET['token'] ?? '');

if ($token === '') {
    errorResponse('Токен подтверждения не передан');
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            email,
            email_verified_at,
            email_verification_expires_at
        FROM users
        WHERE email_verification_token = :token
        LIMIT 1
    ");

    $stmt->execute([
        'token' => $token,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Ссылка подтверждения недействительна', 404);
    }

    if ($user['email_verified_at'] !== null) {
        successResponse([
            'message' => 'Электронная почта уже подтверждена',
            'email_verified' => true,
        ]);
    }

    if (
        $user['email_verification_expires_at'] === null ||
        strtotime($user['email_verification_expires_at']) < time()
    ) {
        jsonResponse([
            'success' => false,
            'status' => 'expired',
            'message' => 'Срок действия ссылки подтверждения истёк',
            'email' => $user['email'],
        ], 410);
    }

    $stmt = $pdo->prepare("
        UPDATE users
        SET
            email_verified_at = NOW(),
            email_verification_token = NULL,
            email_verification_expires_at = NULL,
            email_verification_sent_at = NULL
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => (int) $user['id'],
    ]);

    successResponse([
        'message' => 'Электронная почта успешно подтверждена',
        'email_verified' => true,
    ]);
} catch (Throwable $error) {
    errorResponse('Ошибка подтверждения электронной почты', 500);
}
```

---

# 16. `api/auth/resend-verification.php`

```php
<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../mail/MailService.php';

use GoStudy\Mail\MailService;

$appConfig = require __DIR__ . '/../config/app.php';
$authConfig = require __DIR__ . '/../config/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$data = getJsonInput();

$email = mb_strtolower(trim($data['email'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Некорректный email');
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            email,
            full_name,
            email_verified_at,
            email_verification_sent_at
        FROM users
        WHERE email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Пользователь с таким email не найден', 404);
    }

    if ($user['email_verified_at'] !== null) {
        errorResponse('Электронная почта уже подтверждена', 409);
    }

    if ($user['email_verification_sent_at'] !== null) {
        $lastSentAt = strtotime($user['email_verification_sent_at']);
        $nextAllowedAt = $lastSentAt + (int) $authConfig['verification_resend_interval'];

        if ($nextAllowedAt > time()) {
            errorResponse('Повторную отправку можно выполнить через минуту', 429);
        }
    }

    $verificationToken = bin2hex(random_bytes(32));
    $verificationExpiresAt = date(
        'Y-m-d H:i:s',
        time() + (int) $authConfig['verification_lifetime']
    );
    $verificationSentAt = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        UPDATE users
        SET
            email_verification_token = :email_verification_token,
            email_verification_expires_at = :email_verification_expires_at,
            email_verification_sent_at = :email_verification_sent_at
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'email_verification_token' => $verificationToken,
        'email_verification_expires_at' => $verificationExpiresAt,
        'email_verification_sent_at' => $verificationSentAt,
        'id' => (int) $user['id'],
    ]);

    $verificationUrl =
        $appConfig['url']
        . '/verify-email?token='
        . urlencode($verificationToken);

    $mailService = new MailService();

    $mailSent = $mailService->sendVerificationEmail(
        $email,
        $user['full_name'] ?: 'пользователь GoStudy',
        $verificationUrl
    );

    if (!$mailSent) {
        errorResponse('Не удалось отправить письмо подтверждения', 500);
    }

    successResponse([
        'message' => 'Новое письмо подтверждения отправлено',
        'email_verification_required' => true,
        'mail_sent' => true,
    ]);
} catch (Throwable $error) {
    errorResponse('Ошибка повторной отправки письма', 500);
}
```

---

# 17. `api/auth/login.php`

```php
<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/json.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$data = getJsonInput();

$email = mb_strtolower(trim($data['email'] ?? ''));
$password = (string) ($data['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Некорректный email');
}

if ($password === '') {
    errorResponse('Укажите пароль');
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            role,
            email,
            password_hash,
            full_name,
            phone,
            avatar_url,
            status,
            email_verified_at,
            profile_completed,
            email_verification_expires_at
        FROM users
        WHERE email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        errorResponse('Неверный email или пароль', 401);
    }

    if ($user['status'] === 'blocked') {
        errorResponse('Аккаунт заблокирован. Обратитесь в поддержку.', 403);
    }

    if ($user['status'] === 'archived') {
        errorResponse('Аккаунт архивирован. Обратитесь в поддержку.', 403);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Аккаунт недоступен', 403);
    }

    if ($user['email_verified_at'] === null) {
        $isVerificationExpired =
            $user['email_verification_expires_at'] === null
            || strtotime($user['email_verification_expires_at']) < time();

        jsonResponse([
            'success' => false,
            'message' => $isVerificationExpired
                ? 'Срок действия письма подтверждения истёк.'
                : 'Подтвердите электронную почту.',
            'status' => 'email_not_verified',
            'email' => $user['email'],
            'verification_expired' => $isVerificationExpired,
        ], 403);
    }

    successResponse([
        'message' => 'Вход выполнен',
        'user' => [
            'id' => (int) $user['id'],
            'role' => $user['role'],
            'email' => $user['email'],
            'full_name' => $user['full_name'],
            'phone' => $user['phone'],
            'avatar_url' => $user['avatar_url'],
            'status' => $user['status'],
            'email_verified' => true,
            'profile_completed' => (bool) $user['profile_completed'],
        ],
    ]);
} catch (Throwable $error) {
    errorResponse('Ошибка входа', 500);
}
```

---

# 18. `src/api/api.js`

```javascript
const API_BASE = import.meta.env.DEV
    ? 'https://gostudyonline.ru/api'
    : '/api';

export const API = {
    register: `${API_BASE}/auth/register.php`,
    login: `${API_BASE}/auth/login.php`,
    verifyEmail: `${API_BASE}/auth/verify-email.php`,
    resendVerification: `${API_BASE}/auth/resend-verification.php`,
    forgotPassword: `${API_BASE}/auth/forgot-password.php`,
    resetPassword: `${API_BASE}/auth/reset-password.php`,
};
```

---

# 19. `src/pages/Login/Login.jsx`

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { API } from '../../api/api';

import './Login.css';

export function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async (event) => {
        event.preventDefault();

        setErrorMessage('');
        setIsLoading(true);

        try {
            const response = await fetch(API.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                if (result.status === 'email_not_verified') {
                    navigate(
                        `/verify-email?email=${encodeURIComponent(result.email || email)}`
                    );
                    return;
                }

                throw new Error(result.message || 'Ошибка входа');
            }

            const user = result.user;

            localStorage.setItem('gostudy_user', JSON.stringify(user));

            if (!user.profile_completed) {
                navigate(`/profile-start?role=${user.role}`);
                return;
            }

            navigate('/account');
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось выполнить вход'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-card">
                <Link className="auth-card__back" to="/">
                    ← На главную
                </Link>

                <h1>Вход</h1>

                <form className="auth-card__form" onSubmit={handleLogin}>
                    <label>
                        <span>Почта</span>

                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="example@mail.ru"
                            autoComplete="email"
                            required
                        />
                    </label>

                    <label>
                        <span>Пароль</span>

                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Введите пароль"
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    {errorMessage && (
                        <p className="auth-card__error">
                            {errorMessage}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Входим...' : 'Войти'}
                    </button>
                </form>

                <Link className="auth-card__forgot" to="/password-reset">
                    Забыли пароль?
                </Link>

                <p className="auth-card__bottom">
                    Нет аккаунта?{' '}
                    <Link to="/register">
                        Зарегистрироваться
                    </Link>
                </p>
            </section>
        </main>
    );
}
```

---

# 20. `src/pages/VerifyEmail/VerifyEmail.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { API } from '../../api/api';

import './VerifyEmail.css';

const STATUS_CONTENT = {
    loading: {
        title: 'Проверяем ссылку',
        text: 'Пожалуйста, подождите. Мы подтверждаем вашу электронную почту.',
        buttonText: '',
        buttonLink: '',
    },
    waiting: {
        title: 'Подтвердите электронную почту',
        text: 'Мы уже отправили письмо для подтверждения. Проверьте почту или запросите новое письмо.',
        buttonText: 'Отправить письмо повторно',
        buttonLink: '',
    },
    success: {
        title: 'Электронная почта подтверждена',
        text: 'Спасибо! Теперь вы можете войти в GoStudy и продолжить заполнение профиля.',
        buttonText: 'Войти',
        buttonLink: '/login',
    },
    expired: {
        title: 'Срок действия ссылки истёк',
        text: 'Ссылка подтверждения действует 24 часа. Отправьте новое письмо для подтверждения почты.',
        buttonText: 'Отправить письмо повторно',
        buttonLink: '',
    },
    resent: {
        title: 'Новое письмо отправлено',
        text: 'Проверьте электронную почту. Мы отправили новую ссылку подтверждения.',
        buttonText: 'Войти',
        buttonLink: '/login',
    },
    invalid: {
        title: 'Ссылка недействительна',
        text: 'Возможно, ссылка уже была использована или содержит ошибку.',
        buttonText: 'На главную',
        buttonLink: '/',
    },
};

export function VerifyEmail() {
    const [searchParams] = useSearchParams();

    const token = useMemo(
        () => searchParams.get('token') || '',
        [searchParams]
    );

    const emailFromQuery = useMemo(
        () => searchParams.get('email') || '',
        [searchParams]
    );

    const initialStatus = token
        ? 'loading'
        : emailFromQuery
            ? 'waiting'
            : 'invalid';

    const [status, setStatus] = useState(initialStatus);
    const [email, setEmail] = useState(emailFromQuery);
    const [message, setMessage] = useState('');
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        if (!token) {
            return;
        }

        let isMounted = true;

        const verifyEmail = async () => {
            try {
                const response = await fetch(
                    `${API.verifyEmail}?token=${encodeURIComponent(token)}`
                );

                const result = await response.json();

                if (!isMounted) {
                    return;
                }

                if (response.ok && result.success) {
                    setStatus('success');
                    return;
                }

                if (response.status === 410) {
                    setEmail(result.email || '');
                    setStatus('expired');
                    return;
                }

                setStatus('invalid');
            } catch {
                if (isMounted) {
                    setStatus('invalid');
                }
            }
        };

        verifyEmail();

        return () => {
            isMounted = false;
        };
    }, [token]);

    const handleResend = async () => {
        if (!email || isResending) {
            return;
        }

        setIsResending(true);
        setMessage('');

        try {
            const response = await fetch(API.resendVerification, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Не удалось отправить письмо');
            }

            setStatus('resent');
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось отправить письмо'
            );
        } finally {
            setIsResending(false);
        }
    };

    const content = STATUS_CONTENT[status];

    return (
        <main className="verify-email-page">
            <section className={`verify-email-card verify-email-card--${status}`}>
                <div className="verify-email-card__visual">
                    <div className={`mail-envelope mail-envelope--${status}`}>
                        <div className="mail-envelope__paper">
                            <span>GoStudy</span>
                        </div>

                        <div className="mail-envelope__back" />
                        <div className="mail-envelope__body" />
                        <div className="mail-envelope__flap" />

                        <div className="mail-envelope__seal">
                            {(status === 'success' || status === 'resent') && 'GS'}
                            {(status === 'expired' || status === 'waiting') && '⏳'}
                            {status === 'invalid' && '×'}
                            {status === 'loading' && '…'}
                        </div>
                    </div>
                </div>

                <div className="verify-email-card__content">
                    <p className="verify-email-card__eyebrow">
                        Подтверждение почты
                    </p>

                    <h1>{content.title}</h1>

                    <p>{content.text}</p>

                    {email && (status === 'waiting' || status === 'expired') && (
                        <p className="verify-email-card__email">
                            {email}
                        </p>
                    )}

                    {message && (
                        <p className="verify-email-card__message">
                            {message}
                        </p>
                    )}

                    {(status === 'waiting' || status === 'expired') ? (
                        <button
                            type="button"
                            className="verify-email-card__button"
                            disabled={!email || isResending}
                            onClick={handleResend}
                        >
                            {isResending
                                ? 'Отправляем...'
                                : content.buttonText}
                        </button>
                    ) : (
                        content.buttonText && (
                            <Link
                                className="verify-email-card__button"
                                to={content.buttonLink}
                            >
                                {content.buttonText}
                            </Link>
                        )
                    )}
                </div>
            </section>
        </main>
    );
}
```

---

# 21. Добавления в `src/pages/VerifyEmail/VerifyEmail.css`

```css
.verify-email-card__email {
    margin: 14px 0 0;
    color: var(--color-ink-strong);
    font-size: 15px;
    font-weight: 900;
    word-break: break-word;
}

.verify-email-card__button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.verify-email-card__message {
    margin: 14px 0 0;
    color: #7a1f1f;
    font-size: 14px;
    font-weight: 800;
    line-height: 1.45;
}

.mail-envelope--resent .mail-envelope__flap,
.mail-envelope--success .mail-envelope__flap {
    transform: rotateX(180deg);
    z-index: 0;
}

.mail-envelope--resent .mail-envelope__paper,
.mail-envelope--success .mail-envelope__paper {
    top: -18px;
}

.mail-envelope--resent .mail-envelope__seal,
.mail-envelope--success .mail-envelope__seal {
    background: var(--color-student);
}

.mail-envelope--waiting .mail-envelope__seal {
    background: var(--color-pricing);
}
```

---

# 22. Проверенные сценарии

Проверено:

- регистрация создаёт пользователя;
- токен пишется в `users`;
- письмо уходит;
- письмо приходит, иногда в спам;
- `verify-email.php` подтверждает email;
- после подтверждения:
  - `email_verified_at` заполняется;
  - `email_verification_token` очищается;
  - `email_verification_expires_at` очищается;
  - `email_verification_sent_at` очищается;
- просроченная ссылка возвращает `410`;
- кнопка повторной отправки появляется;
- новое письмо отправляется;
- вход неподтверждённого пользователя переводит на `/verify-email?email=...`;
- повторная отправка через фронт работает.

---

# 23. Важные решения

- Ссылка подтверждения действует 24 часа.
- Повторная отправка разрешена не чаще одного раза в 60 секунд.
- Токены одноразовые.
- После успешного подтверждения токен очищается.
- Минимальная регистрация собирает только:
  - роль;
  - email;
  - пароль;
  - согласие на фронте.
- ФИО и телефон заполняются позже в анкете.
- `status` пользователя:
  - `active`;
  - `blocked`;
  - `archived`.
- `email_verified_at` отвечает только за подтверждение почты.
- `profile_completed` отвечает только за заполнение анкеты.
- URL API вынесены в `src/api/api.js`.

---

# 24. Что осталось

Следующие задачи:

```text
□ me.php
□ logout.php
□ AuthContext
□ сохранение анкеты ученика
□ сохранение анкеты преподавателя
□ profile_completed = 1 после анкеты
□ убрать демо-пользователя Артёма
□ подключить кабинет к реальному пользователю
□ forgot-password.php
□ reset-password.php
```

---

# 25. Важное для продолжения

Перед продолжением нужно загрузить архив фронта GoStudy, потому что:

- анкета учителя уже переписана на несколько шагов;
- нужно смотреть актуальную структуру `ProfileStart`;
- нельзя продолжать сохранение анкеты по старым отдельным файлам без анализа фронта.

Следующий логичный этап:

```text
1. Распаковать и изучить архив фронта.
2. Найти актуальные формы ученика и учителя.
3. Сверить поля с таблицами student_profiles / teacher_profiles.
4. Написать API сохранения анкет.
5. После сохранения выставлять users.profile_completed = 1.
6. После этого переходить к реальному кабинету и me.php.
```
