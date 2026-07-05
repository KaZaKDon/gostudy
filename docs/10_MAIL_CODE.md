# 10_MAIL_CODE.md — Полный код почтового модуля GoStudy

Документ фиксирует полный финальный код PHP-файлов, написанных для почтового модуля GoStudy в этом чате.

Тестовый файл `api/mail/test.php` сюда не включён.

---

# 1. Структура файлов

```text
gostudyonline.ru/
├── .env
└── api/
    ├── config/
    │   ├── env.php
    │   └── mail.php
    │
    ├── lib/
    │   └── PHPMailer/
    │       ├── Exception.php
    │       ├── PHPMailer.php
    │       └── SMTP.php
    │
    └── mail/
        ├── MailService.php
        └── templates/
            ├── layout.php
            └── verification.php
```

---

# 2. Файл `.env`

Путь:

```text
gostudyonline.ru/.env
```

Содержимое:

```env
# SMTP

MAIL_HOST=mail.gostudyonline.ru
MAIL_PORT=465
MAIL_ENCRYPTION=ssl

MAIL_USERNAME=noreply@gostudyonline.ru
MAIL_PASSWORD=********

MAIL_FROM_ADDRESS=noreply@gostudyonline.ru
MAIL_FROM_NAME=GoStudy
```

Пароль в документации не хранится. В рабочем файле `.env` вместо `********` должен быть настоящий пароль от ящика `noreply@gostudyonline.ru`.

---

# 3. Файл `api/config/env.php`

Путь:

```text
api/config/env.php
```

Код:

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

# 4. Файл `api/config/mail.php`

Путь:

```text
api/config/mail.php
```

Код:

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

# 5. Файл `api/mail/MailService.php`

Путь:

```text
api/mail/MailService.php
```

Код:

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

# 6. Файл `api/mail/templates/layout.php`

Путь:

```text
api/mail/templates/layout.php
```

Код:

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

# 7. Файл `api/mail/templates/verification.php`

Путь:

```text
api/mail/templates/verification.php
```

Код:

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

# 8. Внешняя библиотека PHPMailer

Путь:

```text
api/lib/PHPMailer/
```

Файлы:

```text
Exception.php
PHPMailer.php
SMTP.php
```

Источник:

```text
PHPMailer-master/src/
```

В документации код этих файлов не дублируется, так как это внешняя библиотека.

---

# 9. Что уже проверено

Проверено тестовым файлом `api/mail/test.php`:

- подключение к SMTP прошло успешно;
- авторизация прошла успешно;
- сервер принял отправителя `noreply@gostudyonline.ru`;
- сервер принял получателя;
- письмо успешно поставлено в очередь;
- письмо дошло до почтового ящика после исправления опечатки в адресе получателя.

Тестовый файл после проверки должен быть удалён.

---

# 10. Следующий этап

Следующим этапом нужно подключить почтовый модуль к регистрации:

1. Обновить `api/auth/register.php`.
2. После создания пользователя генерировать токен подтверждения email.
3. Записывать в `users` поля:
   - `email_verification_token`
   - `email_verification_expires_at`
   - `email_verification_sent_at`
4. Отправлять письмо через:

```php
$mailService = new \GoStudy\Mail\MailService();

$mailService->sendVerificationEmail(
    $email,
    $fullName,
    $verificationUrl
);
```

5. Создать endpoint подтверждения:
   - `api/auth/verify-email.php`
6. После перехода по ссылке:
   - проверять токен;
   - проверять срок действия;
   - записывать `email_verified_at`;
   - очищать токен и срок действия.
7. Позже этим же почтовым модулем реализовать восстановление пароля.
