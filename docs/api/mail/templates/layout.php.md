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