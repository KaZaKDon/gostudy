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