# 10_MAIL.md --- Почтовый модуль GoStudy

Документ фиксирует итоговую структуру и код почтового модуля.

## Структура

``` text
api/
├── config/
│   ├── env.php
│   └── mail.php
├── lib/
│   └── PHPMailer/
│       ├── Exception.php
│       ├── PHPMailer.php
│       └── SMTP.php
├── mail/
│   ├── MailService.php
│   └── templates/
│       ├── layout.php
│       └── verification.php
└── .env
```

В документ следует перенести финальные версии файлов: -
api/config/env.php - api/config/mail.php - api/mail/MailService.php -
api/mail/templates/layout.php - api/mail/templates/verification.php

## .env

``` env
MAIL_HOST=mail.gostudyonline.ru
MAIL_PORT=465
MAIL_ENCRYPTION=ssl
MAIL_USERNAME=noreply@gostudyonline.ru
MAIL_PASSWORD=********
MAIL_FROM_ADDRESS=noreply@gostudyonline.ru
MAIL_FROM_NAME=GoStudy
```

## Следующий этап

1.  Интеграция MailService в регистрацию.
2.  Генерация и сохранение токена подтверждения.
3.  verify-email.php.
4.  Повторная отправка письма.
5.  Восстановление пароля.
